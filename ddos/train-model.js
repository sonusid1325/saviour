const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-cpu');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('🧠 Training DDoS Detection Model with TensorFlow.js\n');

// Feature columns to use (excluding target and non-numeric fields)
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

// Load and parse CSV data
async function loadCSVData(filePath, maxRows = 50000) {
  return new Promise((resolve, reject) => {
    const data = [];
    let rowCount = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (rowCount < maxRows) {
          data.push(row);
          rowCount++;
          if (rowCount % 10000 === 0) {
            console.log(`  Loaded ${rowCount} rows...`);
          }
        }
      })
      .on('end', () => {
        console.log(`✅ Loaded ${data.length} rows from CSV\n`);
        resolve(data);
      })
      .on('error', reject);
  });
}

// Convert boolean strings to numbers
function convertValue(value) {
  if (value === 'True' || value === 'true') return 1;
  if (value === 'False' || value === 'false') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// Prepare training data
function prepareData(rawData) {
  console.log('📊 Preparing training data...');
  
  const features = [];
  const labels = [];
  
  rawData.forEach((row, idx) => {
    const featureVector = FEATURE_COLUMNS.map(col => convertValue(row[col]));
    let label = parseFloat(row[TARGET_COLUMN]);
    
    // Adjust labels: dataset has 0.0, 1.0, 2.0 but we need 0, 1, 2, 3
    // Assuming 0=benign, 1=low, 2=medium, 3=high based on distribution
    if (label === 0.0) label = 0; // benign
    else if (label === 1.0) label = 1; // low
    else if (label === 2.0) label = 2; // medium  
    else if (label === 3.0) label = 3; // high
    else label = 0; // default to benign
    
    if (!featureVector.includes(NaN) && !isNaN(label)) {
      features.push(featureVector);
      labels.push(label);
    }
  });
  
  console.log(`  Features shape: [${features.length}, ${features[0].length}]`);
  console.log(`  Labels count: ${labels.length}`);
  
  // Calculate class distribution
  const classCounts = {};
  labels.forEach(label => {
    classCounts[label] = (classCounts[label] || 0) + 1;
  });
  console.log('  Class distribution:', classCounts);
  
  // Calculate normalization parameters manually
  const featureCount = features[0].length;
  const mean = new Array(featureCount).fill(0);
  const std = new Array(featureCount).fill(0);
  
  // Calculate mean
  for (let i = 0; i < features.length; i++) {
    for (let j = 0; j < featureCount; j++) {
      mean[j] += features[i][j];
    }
  }
  mean.forEach((val, idx) => mean[idx] = val / features.length);
  
  // Calculate std
  for (let i = 0; i < features.length; i++) {
    for (let j = 0; j < featureCount; j++) {
      std[j] += Math.pow(features[i][j] - mean[j], 2);
    }
  }
  std.forEach((val, idx) => std[idx] = Math.sqrt(val / features.length) + 1e-7);
  
  // Normalize features
  const normalizedFeatures = features.map(row => 
    row.map((val, idx) => (val - mean[idx]) / std[idx])
  );
  
  const featureTensor = tf.tensor2d(normalizedFeatures);
  const labelTensor = tf.tensor1d(labels);
  
  console.log('✅ Data preparation complete\n');
  
  return {
    features: featureTensor,
    labels: labelTensor,
    mean: tf.tensor1d(mean),
    std: tf.tensor1d(std),
    featureCount
  };
}

// Create the neural network model
function createModel(inputShape) {
  console.log('🏗️  Building neural network model...');
  
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [inputShape], units: 64, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: 32, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({ units: 16, activation: 'relu' }),
      tf.layers.dense({ units: 4, activation: 'softmax' }) // 4 classes: 0, 1, 2, 3
    ]
  });
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  console.log('✅ Model architecture created\n');
  model.summary();
  
  return model;
}

// Train the model
async function trainModel(model, features, labels) {
  console.log('\n🎓 Training model...\n');
  
  const history = await model.fit(features, labels, {
    epochs: 10, // Reduced for faster training
    batchSize: 128,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `Epoch ${epoch + 1}: ` +
          `loss=${logs.loss.toFixed(4)}, ` +
          `acc=${logs.acc.toFixed(4)}, ` +
          `val_loss=${logs.val_loss.toFixed(4)}, ` +
          `val_acc=${logs.val_acc.toFixed(4)}`
        );
      }
    }
  });
  
  console.log('\n✅ Training complete!\n');
  return history;
}

// Save the model and normalization parameters
async function saveModel(model, mean, std) {
  const modelDir = path.join(__dirname, 'server', 'ml-model');
  
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  
  // Save model weights as JSON
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
  
  console.log(`✅ Model saved to ${modelDir}`);
  
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
  console.log(`✅ Normalization params saved\n`);
}

// Main training function
async function main() {
  try {
    const csvPath = path.join(__dirname, 'cleaned_dataset.csv');
    
    // Load data
    const rawData = await loadCSVData(csvPath, 20000); // Reduced for faster training
    
    // Prepare data
    const { features, labels, mean, std, featureCount } = prepareData(rawData);
    
    // Create model
    const model = createModel(featureCount);
    
    // Train model
    await trainModel(model, features, labels);
    
    // Save model
    await saveModel(model, mean, std);
    
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║      Model Training Complete! 🎉               ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\nModel is ready to be used in server/app.js\n');
    
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
