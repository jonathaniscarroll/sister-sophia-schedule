import { db, auth } from './firebase-config';

export async function secureFirestoreOperation(operationName: string, operation: () => Promise<any>) {
  try {
    // Verify authentication
    if (!auth.currentUser) {
      throw new Error('Authentication required');
    }
    
    console.log(`Starting Firestore operation: ${operationName}`);
    const result = await operation();
    console.log(`Completed Firestore operation: ${operationName}`);
    return result;
    
  } catch (error) {
    console.error(`Firestore operation failed (${operationName}):`, error);
    
    // Handle specific error cases
    if (error.code === 'permission-denied') {
      console.warn('Permission denied - refreshing auth token');
      await auth.currentUser?.getIdToken(true);
      throw new Error('Please try again after authentication refreshes');
    }
    
    throw error;
  }
}
