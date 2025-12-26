"""
Quick Training Script - Train CV Model on Food Dataset
Optimized for faster training with good accuracy
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os
import sys

# Configuration
IMG_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 25  # Good balance between speed and accuracy
DATA_DIR = '../../data'
MODEL_SAVE_PATH = 'models/food_recognition_model.h5'

# Food classes
FOOD_CLASSES = [
    'Appam', 'Biryani', 'Chapati', 'Dosa', 'Idli',
    'Pongal', 'Poori', 'Porotta', 'Vada', 'White Rice'
]

print("="*60)
print("  TRAINING FOOD RECOGNITION MODEL")
print("="*60)
print(f"\nConfiguration:")
print(f"  Image Size: {IMG_SIZE}x{IMG_SIZE}")
print(f"  Batch Size: {BATCH_SIZE}")
print(f"  Epochs: {EPOCHS}")
print(f"  Classes: {len(FOOD_CLASSES)}")
print(f"  Data Directory: {DATA_DIR}")

# Check if data directory exists
if not os.path.exists(DATA_DIR):
    print(f"\n❌ ERROR: Data directory not found: {DATA_DIR}")
    sys.exit(1)

print(f"\n✅ Data directory found")

# Create data generators
print("\n📊 Creating data generators...")
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=30,
    width_shift_range=0.25,
    height_shift_range=0.25,
    shear_range=0.25,
    zoom_range=0.3,
    horizontal_flip=True,
    brightness_range=[0.8, 1.2],
    fill_mode='nearest',
    validation_split=0.2
)

val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2
)

# Load training data
train_generator = train_datagen.flow_from_directory(
    DATA_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    classes=FOOD_CLASSES,
    shuffle=True
)

# Load validation data
val_generator = val_datagen.flow_from_directory(
    DATA_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    classes=FOOD_CLASSES,
    shuffle=False
)

print(f"\n✅ Training samples: {train_generator.samples}")
print(f"✅ Validation samples: {val_generator.samples}")
print(f"\n📋 Food Classes:")
for i, class_name in enumerate(train_generator.class_indices.keys()):
    print(f"  {i}: {class_name}")

# Build model
print("\n🔨 Building MobileNetV2 model...")
base_model = keras.applications.MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False

model = keras.Sequential([
    base_model,
    keras.layers.GlobalAveragePooling2D(),
    keras.layers.BatchNormalization(),
    keras.layers.Dense(512, activation='relu', kernel_regularizer=keras.regularizers.l2(0.01)),
    keras.layers.Dropout(0.5),
    keras.layers.BatchNormalization(),
    keras.layers.Dense(256, activation='relu', kernel_regularizer=keras.regularizers.l2(0.01)),
    keras.layers.Dropout(0.4),
    keras.layers.Dense(len(FOOD_CLASSES), activation='softmax')
])

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
)

print("\n✅ Model built successfully")
print(f"\n📊 Model Summary:")
model.summary()

# Callbacks
os.makedirs('models', exist_ok=True)
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

# Train
print("\n" + "="*60)
print("  STARTING TRAINING - PHASE 1")
print("="*60)

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=val_generator,
    callbacks=callbacks,
    verbose=1
)

# Fine-tuning phase
print("\n" + "="*60)
print("  FINE-TUNING - PHASE 2")
print("="*60)
print("Unfreezing base model for fine-tuning...")

base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
)

history_fine = model.fit(
    train_generator,
    epochs=10,
    validation_data=val_generator,
    callbacks=callbacks,
    verbose=1
)

# Save final model
model.save(MODEL_SAVE_PATH)
print(f"\n✅ Model saved to: {MODEL_SAVE_PATH}")

# Evaluate
print("\n" + "="*60)
print("  FINAL EVALUATION")
print("="*60)

results = model.evaluate(val_generator, verbose=0)
print(f"\n📊 Final Results:")
print(f"  Validation Loss: {results[0]:.4f}")
print(f"  Validation Accuracy: {results[1]*100:.2f}%")
print(f"  Top-3 Accuracy: {results[2]*100:.2f}%")

print("\n" + "="*60)
print("  TRAINING COMPLETE! ✅")
print("="*60)
print(f"\n✅ Trained model ready at: {MODEL_SAVE_PATH}")
print("✅ CV service can now use this trained model")
print("\nNext step: Start CV service with: python app.py")
