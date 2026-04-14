import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

let db: any;
let authApi: any;

try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (privateKey && !privateKey.includes('PLACEHOLDER')) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey
            })
        });
        console.log('Firebase Admin Initialized Successfully');
    } else {
        console.warn('Firebase Private Key missing/placeholder. Emitting soft mock state until configured.');
    }
} catch (e: any) {
    console.error('Firebase Admin Init failed:', e.message);
}

try {
    if (admin.apps.length > 0) {
        db = admin.firestore();
        authApi = admin.auth();
    } else {
        throw new Error('Fallback to Mocks');
    }
} catch (e) {
    // Mocks structure to let Node run so the Frontend can operate via memory session if Firebase Keys not yet put in.
    const emptyObj = {
        docs: [],
        map: () => [],
        filter: () => []
    };

    const mockDoc = {
        set: async () => { },
        update: async () => { }
    };

    const mockCollection = {
        doc: () => mockDoc,
        add: async () => { },
        where: () => ({
            orderBy: () => ({ get: async () => emptyObj }),
            get: async () => emptyObj
        }),
        get: async () => emptyObj
    };

    db = { collection: () => mockCollection };
    authApi = { verifyIdToken: async (token: string) => ({ uid: 'user1', email: 'user@apna.career' }) };
}

export { db, authApi as auth };
