const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-cpu');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ML Model Integration\n');

async function testModel() {
  try {
    // Load normalization params
    const normPath = path.join(__dirname, 'server/ml-model/normalization.json');
    const normParams = JSON.parse(fs.readFileSync(normPath, 'utf8'));
    
    console.log('✅ Loaded normalization parameters');
    console.log(`   Features: ${normParams.featureColumns.length}`);
    console.log(`   Classes: ${Object.keys(normParams.targetMapping).length}\n`);
    
    // Recreate model architecture
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [31], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'softmax' })
      ]
    });
    
    // Load weights
    const weightsPath = path.join(__dirname, 'server/ml-model/weights.json');
    const weightsData = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    const weights = weightsData.map(w => {
      const dataArray = typeof w.data === 'object' && !Array.isArray(w.data)
        ? Object.values(w.data)
        : w.data;
      return tf.tensor(dataArray, w.shape);
    });
    model.setWeights(weights);
    
    console.log('✅ Model loaded successfully\n');
    
    // Test predictions
    console.log('🎯 Testing Predictions:\n');
    
    // Test case 1: Normal request
    const normalFeatures = [
      12, 4, 0, 100, 0, 14, 0, 5, 1, 0, 0, 0, 1, 5, 80, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1
    ];
    const normalNorm = normalFeatures.map((val, idx) => (val - normParams.mean[idx]) / normParams.std[idx]);
    const normalPred = model.predict(tf.tensor2d([normalNorm]));
    const normalProbs = await normalPred.array();
    const normalClass = normalProbs[0].indexOf(Math.max(...normalProbs[0]));
    
    console.log('1. Normal Request:');
    console.log(`   Predicted: ${normParams.targetMapping[normalClass]} (${Math.round(normalProbs[0][normalClass] * 100)}%)`);
    console.log(`   Probabilities: Benign=${Math.round(normalProbs[0][0]*100)}%, Low=${Math.round(normalProbs[0][1]*100)}%, Medium=${Math.round(normalProbs[0][2]*100)}%, High=${Math.round(normalProbs[0][3]*100)}%\n`);
    
    // Test case 2: Suspicious request
    const suspiciousFeatures = [
      2, 1, 0, 1, 0, 12, 0, 50, 5, 1, 0, 3, 1, 50, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 100, 20, 50
    ];
    const suspiciousNorm = suspiciousFeatures.map((val, idx) => (val - normParams.mean[idx]) / normParams.std[idx]);
    const suspiciousPred = model.predict(tf.tensor2d([suspiciousNorm]));
    const suspiciousProbs = await suspiciousPred.array();
    const suspiciousClass = suspiciousProbs[0].indexOf(Math.max(...suspiciousProbs[0]));
    
    console.log('2. Suspicious Request:');
    console.log(`   Predicted: ${normParams.targetMapping[suspiciousClass]} (${Math.round(suspiciousProbs[0][suspiciousClass] * 100)}%)`);
    console.log(`   Probabilities: Benign=${Math.round(suspiciousProbs[0][0]*100)}%, Low=${Math.round(suspiciousProbs[0][1]*100)}%, Medium=${Math.round(suspiciousProbs[0][2]*100)}%, High=${Math.round(suspiciousProbs[0][3]*100)}%\n`);
    
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   ✅ ML Model Integration Test PASSED!        ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testModel();
