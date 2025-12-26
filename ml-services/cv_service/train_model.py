"""
Train Food Recognition Model
Uses transfer learning with MobileNetV2 on the food image dataset
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os
import numpy as np
from pathlib import Path

# Configuration
IMG_SIZE = 224
BATCH_SIZE = 16  # Reduced for better learning
EPOCHS = 30  # Increased for better accuracy
DATA_DIR = '../../data'  # Path to food images directory
MODEL_SAVE_PATH = 'models/food_recognition_model.h5'

# Food classes
FOOD_CLASSES = [
    'Appam',
    'Biryani', 
    'Chapati',
    'Dosa',
    'Idli',
    'Pongal',
    'Poori',
    'Porotta',
    'Vada',
    'White Rice'
]

def create_data_generators():
    """Create data generators with augmentation"""
    
    # Data augmentation for training
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=0.2  # 80-20 split
    )
    
    # Validation data - only rescaling
    val_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2
    )
    
    # Training generator
    train_generator = train_datagen.flow_from_directory(
        DATA_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        classes=FOOD_CLASSES
    )
    
    # Validation generator
    val_generator = val_datagen.flow_from_directory(
        DATA_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        classes=FOOD_CLASSES
    )
    
    return train_generator, val_generator

def build_model():
    """Build transfer learning model with MobileNetV2"""
    
    print("Building model with MobileNetV2...")
    
    # Load pre-trained MobileNetV2
    base_model = keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model initially
    base_model.trainable = False
    
    # Add custom layers with more capacity
    model = keras.Sequential([
        base_model,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.BatchNormalization(),
        keras.layers.Dense(512, activation='relu'),
        keras.layers.Dropout(0.5),
        keras.layers.BatchNormalization(),
        keras.layers.Dense(256, activation='relu'),
        keras.layers.Dropout(0.4),
        keras.layers.BatchNormalization(),
        keras.layers.Dense(128, activation='relu'),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(len(FOOD_CLASSES), activation='softmax')
    ])
    
    # Compile model
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
    )
    
    return model

def train_model():
    """Train the food recognition model"""
    
    print("Starting model training...")
    print(f"Data directory: {DATA_DIR}")
    print(f"Food classes: {FOOD_CLASSES}")
    
    # Check if data directory exists
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory {DATA_DIR} not found!")
        return
    
    # Create generators
    print("\nCreating data generators...")
    train_generator, val_generator = create_data_generators()
    
    print(f"Training samples: {train_generator.samples}")
    print(f"Validation samples: {val_generator.samples}")
    
    # Build model
    model = build_model()
    print("\nModel architecture:")
    model.summary()
    
    # Callbacks
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            MODEL_SAVE_PATH,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        )
    ]
    
    # Train model
    print("\n" + "="*50)
    print("STARTING TRAINING")
    print("="*50 + "\n")
    
    history = model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=val_generator,
        callbacks=callbacks,
        verbose=1
    )
    
    # Fine-tuning phase
    print("\n" + "="*50)
    print("FINE-TUNING PHASE")
    print("="*50 + "\n")
    
    # Unfreeze base model
    model.layers[0].trainable = True
    
    # Recompile with lower learning rate
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.0001),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
    )
    
    # Continue training
    history_fine = model.fit(
        train_generator,
        epochs=10,
        validation_data=val_generator,
        callbacks=callbacks,
        verbose=1
    )
    
    # Save final model
    model.save(MODEL_SAVE_PATH)
    print(f"\n✅ Model saved to {MODEL_SAVE_PATH}")
    
    # Evaluate
    print("\n" + "="*50)
    print("FINAL EVALUATION")
    print("="*50)
    
    val_loss, val_acc, val_top3_acc = model.evaluate(val_generator)
    print(f"\nValidation Accuracy: {val_acc*100:.2f}%")
    print(f"Top-3 Validation Accuracy: {val_top3_acc*100:.2f}%")
    print(f"Validation Loss: {val_loss:.4f}")
    
    return model, history

if __name__ == '__main__':
    # Create models directory
    os.makedirs('models', exist_ok=True)
    
    # Train model
    model, history = train_model()
    
    print("\n✅ Training complete!")
