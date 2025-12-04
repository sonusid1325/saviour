const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-cpu');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🧠 Advanced DDoS Detection Model Training (v2)           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Feature columns (31 features)
const FEATURE_COLUMNS = [
  'hour', 'day_of_week', 'is_weekend', 'time_diff_seconds', 'is_ipv6',
  'ip_length', 'is_private_range', 'endpoint_length', 'endpoint_depth',
  'has_query_params', 'has_file_extension', 'suspicious_keywords',
  'has_path', 'path_length', 'ua_length', 'is_unknown', 'is_chrome',
  'is_firefox', 'is_safari', 'is_edge', 'is_ie', 'is_mobile',
  'is_windows', 'is_mac', 'is_linux', 'is_bot', 'is_automated',
  'country_risk_score', 'ip_request_count', 'ip_unique_endpoints',
  'ip_hourly_requests'
];

const TARGET_COLUMN = 'target_encoded';

// Load CSV data with progress
async function loadCSVData(filePath, maxRows = 100000) {
  return new Promise((resolve, reject) => {
    const data = [];
    let rowCount = 0;
    const startTime = Date.now();

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (rowCount < maxRows) {
          data.push(row);
          rowCount++;
          if (rowCount % 20000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`  📥 Loaded ${rowCount.toLocaleString()} rows (${elapsed}s)...`);
          }
        }
      })
      .on('end', () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ Loaded ${data.length.toLocaleString()} rows in ${elapsed}s\n`);
        resolve(data);
      })
      .on('error', reject);
  });
}

// Convert values
function convertValue(value) {
  if (value === 'True' || value === 'true') return 1;
  if (value === 'False' || value === 'false') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// Prepare and balance dataset
function prepareData(rawData) {
  console.log('📊 Preparing and balancing dataset...\n');
  
  const dataByClass = { 0: [], 1: [], 2: [], 3: [] };
  
  // Separate data by class
  rawData.forEach((row) => {
    const featureVector = FEATURE_COLUMNS.map(col => convertValue(row[col]));
    let label = parseFloat(row[TARGET_COLUMN]);
    
    // Map labels: 0.0->0 (benign), 1.0->1 (low), 2.0->2 (medium), 3.0->3 (high)
    if (label === 0.0) label = 0;
    else if (label === 1.0) label = 1;
    else if (label === 2.0) label = 2;
    else if (label === 3.0) label = 3;
    else return; // Skip invalid labels
    
    if (!featureVector.includes(NaN) && label >= 0 && label <= 3) {
      dataByClass[label].push({ features: featureVector, label });
    }
  });
  
  // Print class distribution
  console.log('Original class distribution:');
  Object.keys(dataByClass).forEach(cls => {
    const count = dataByClass[cls].length;
    const pct = ((count / rawData.length) * 100).toFixed(1);
    const className = ['Benign', 'Low', 'Medium', 'High'][cls];
    console.log(`  Class ${cls} (${className}): ${count.toLocaleString()} samples (${pct}%)`);
  });
  
  // Balance dataset by oversampling minority classes
  const classCounts = Object.keys(dataByClass).map(k => dataByClass[k].length);
  const maxSamples = Math.max(...classCounts.filter(c => c > 0));
  const targetPerClass = Math.min(maxSamples, 20000); // Cap at 20k per class
  
  console.log(`\n🔄 Balancing dataset (target: ${targetPerClass.toLocaleString()} samples per class)...`);
  
  const balancedFeatures = [];
  const balancedLabels = [];
  
  Object.keys(dataByClass).forEach(cls => {
    const classData = dataByClass[cls];
    if (classData.length === 0) {
      console.log(`  ⚠️  Skipping class ${cls} (no samples)`);
      return;
    }
    
    const needed = Math.min(targetPerClass, classData.length * 100); // Oversample up to 100x
    
    for (let i = 0; i < needed; i++) {
      const sample = classData[i % classData.length]; // Oversample if needed
      balancedFeatures.push(sample.features);
      balancedLabels.push(sample.label);
    }
    
    const className = ['Benign', 'Low', 'Medium', 'High'][cls];
    console.log(`  Class ${cls} (${className}): ${needed.toLocaleString()} samples (${classData.length.toLocaleString()} original)`);
  });
  
  console.log(`\nBalanced dataset: ${balancedFeatures.length.toLocaleString()} total samples\n`);
  
  // Shuffle the balanced dataset
  const indices = Array.from({ length: balancedFeatures.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  const shuffledFeatures = indices.map(i => balancedFeatures[i]);
  const shuffledLabels = indices.map(i => balancedLabels[i]);
  
  // Calculate normalization parameters
  console.log('📐 Calculating normalization parameters...');
  const featureCount = shuffledFeatures[0].length;
  const mean = new Array(featureCount).fill(0);
  const std = new Array(featureCount).fill(0);
  
  // Calculate mean
  for (let i = 0; i < shuffledFeatures.length; i++) {
    for (let j = 0; j < featureCount; j++) {
      mean[j] += shuffledFeatures[i][j];
    }
  }
  mean.forEach((val, idx) => mean[idx] = val / shuffledFeatures.length);
  
  // Calculate std
  for (let i = 0; i < shuffledFeatures.length; i++) {
    for (let j = 0; j < featureCount; j++) {
      std[j] += Math.pow(shuffledFeatures[i][j] - mean[j], 2);
    }
  }
  std.forEach((val, idx) => std[idx] = Math.sqrt(val / shuffledFeatures.length) + 1e-7);
  
  // Normalize features
  const normalizedFeatures = shuffledFeatures.map(row => 
    row.map((val, idx) => (val - mean[idx]) / std[idx])
  );
  
  const featureTensor = tf.tensor2d(normalizedFeatures);
  const labelTensor = tf.tensor1d(shuffledLabels);
  
  console.log('✅ Data preparation complete\n');
  
  return {
    features: featureTensor,
    labels: labelTensor,
    mean: tf.tensor1d(mean),
    std: tf.tensor1d(std),
    featureCount
  };
}

// Create improved model architecture
function createModel(inputShape) {
  console.log('🏗️  Building improved neural network...\n');
  
  const model = tf.sequential({
    layers: [
      // Input layer with batch normalization
      tf.layers.dense({ 
        inputShape: [inputShape], 
        units: 128, 
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }),
      tf.layers.batchNormalization(),
      tf.layers.dropout({ rate: 0.4 }),
      
      // Hidden layer 1
      tf.layers.dense({ 
        units: 64, 
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }),
      tf.layers.batchNormalization(),
      tf.layers.dropout({ rate: 0.3 }),
      
      // Hidden layer 2
      tf.layers.dense({ 
        units: 32, 
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }),
      tf.layers.dropout({ rate: 0.2 }),
      
      // Output layer
      tf.layers.dense({ 
        units: 4, 
        activation: 'softmax' 
      })
    ]
  });
  
  // Use categorical crossentropy with Adam optimizer
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  console.log('Model Architecture:');
  model.summary();
  console.log('');
  
  return model;
}

// Train with early stopping and learning rate reduction
async function trainModel(model, features, labels) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🎓 Training Advanced Model                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  let bestValAcc = 0;
  let patience = 0;
  const maxPatience = 5;
  
  const history = await model.fit(features, labels, {
    epochs: 30,
    batchSize: 256,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const progressBar = '█'.repeat(Math.floor((epoch + 1) / 30 * 50));
        console.log(
          `Epoch ${(epoch + 1).toString().padStart(2)}/${30} ${progressBar.padEnd(50)} ` +
          `loss: ${logs.loss.toFixed(4)} ` +
          `acc: ${(logs.acc * 100).toFixed(2)}% ` +
          `val_loss: ${logs.val_loss.toFixed(4)} ` +
          `val_acc: ${(logs.val_acc * 100).toFixed(2)}%`
        );
        
        // Track best validation accuracy
        if (logs.val_acc > bestValAcc) {
          bestValAcc = logs.val_acc;
          patience = 0;
        } else {
          patience++;
        }
        
        // Early stopping (disabled for now to get full training)
        // if (patience >= maxPatience) {
        //   console.log('\n⏹️  Early stopping triggered');
        //   model.stopTraining = true;
        // }
      }
    }
  });
  
  console.log('\n✅ Training complete!');
  console.log(`   Best validation accuracy: ${(bestValAcc * 100).toFixed(2)}%\n`);
  
  return history;
}

// Save model
async function saveModel(model, mean, std) {
  const modelDir = path.join(__dirname, 'server', 'ml-model');
  
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  
  console.log('💾 Saving model...');
  
  // Save weights
  const weights = model.getWeights();
  const weightsData = await Promise.all(weights.map(async w => ({
    name: w.name,
    shape: w.shape,
    data: await w.data()
  })));
  
  fs.writeFileSync(
    path.join(modelDir, 'weights.json'),
    JSON.stringify(weightsData, null, 2)
  );
  
  // Save model config
  const config = model.toJSON();
  fs.writeFileSync(
    path.join(modelDir, 'model.json'),
    JSON.stringify(config, null, 2)
  );
  
  // Save normalization parameters
  const normParams = {
    mean: await mean.array(),
    std: await std.array(),
    featureColumns: FEATURE_COLUMNS,
    targetMapping: {
      0: 'benign',   // Normal traffic
      1: 'low',      // Suspicious activity
      2: 'medium',   // Likely attack
      3: 'high'      // Confirmed attack
    }
  };
  
  fs.writeFileSync(
    path.join(modelDir, 'normalization.json'),
    JSON.stringify(normParams, null, 2)
  );
  
  console.log(`✅ Model saved to ${modelDir}\n`);
}

// Main training function
async function main() {
  try {
    const csvPath = path.join(__dirname, 'cleaned_dataset.csv');
    
    // Load data (100k samples for good training)
    const rawData = await loadCSVData(csvPath, 100000);
    
    // Prepare and balance data
    const { features, labels, mean, std, featureCount } = prepareData(rawData);
    
    // Create improved model
    const model = createModel(featureCount);
    
    // Train model
    await trainModel(model, features, labels);
    
    // Save model
    await saveModel(model, mean, std);
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 Advanced Model Training Complete!                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n✅ Your improved model is ready to use!');
    console.log('   Start the server: npm run server\n');
    
    // Cleanup
    features.dispose();
    labels.dispose();
    mean.dispose();
    std.dispose();
    
  } catch (error) {
    console.error('❌ Error during training:', error);
    process.exit(1);
  }
}

main();
