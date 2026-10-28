import mongoose from 'mongoose';

/**
 * Connect to MongoDB with configurable retry and timeout options.
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/akatsukis_draft';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // If not in test environment, we might want to let the caller handle it or rethrow
    throw error;
  }
};

/**
 * Disconnect from MongoDB gracefully.
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed');
  } catch (error) {
    console.error(`[Database Error] Failed to close connection: ${error.message}`);
  }
};

export default connectDB;
