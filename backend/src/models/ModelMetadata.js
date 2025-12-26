const mongoose = require('mongoose');

const modelMetadataSchema = new mongoose.Schema({
  modelName: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: String,
    required: true,
    unique: true
  },
  modelType: {
    type: String,
    enum: ['LSTM', 'CNN', 'XGBoost', 'Linear Regression', 'Hybrid'],
    default: 'LSTM'
  },
  trainedOn: {
    type: String,
    description: 'Data source used for training (e.g., "synthetic + clinical rules", "PhysioNet CGMacros")'
  },
  featureCount: {
    type: Number,
    required: true
  },
  inputFeatures: [String], // List of feature names used
  outputTarget: String, // What the model predicts (e.g., "glucose_mg_dl")
  
  // Performance metrics
  performanceMetrics: {
    rmse: Number,
    mae: Number,
    r2Score: Number,
    accuracy: Number,
    precision: Number,
    recall: Number,
    testDataSize: Number
  },
  
  // Training details
  trainingDetails: {
    epochs: Number,
    batchSize: Number,
    learningRate: Number,
    optimizer: String,
    lossFunction: String,
    trainingDuration_minutes: Number
  },
  
  // Explainability & Academic Info
  explainabilityMethod: {
    type: String,
    enum: ['SHAP', 'LIME', 'Attention Mechanism', 'Feature Importance', 'None'],
    default: 'SHAP'
  },
  paperReference: String, // Link to paper or publication
  referencedIn: [String], // Project components that use this model
  
  // Status
  status: {
    type: String,
    enum: ['active', 'deprecated', 'experimental', 'archived'],
    default: 'active'
  },
  isProduction: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String, // Developer/researcher who created this
  notes: String
});

// Index for version lookups
modelMetadataSchema.index({ version: 1 });
modelMetadataSchema.index({ status: 1, isProduction: 1 });

module.exports = mongoose.model('ModelMetadata', modelMetadataSchema);
