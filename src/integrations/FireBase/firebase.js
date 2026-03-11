// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyAU7iYrWAnosiZtecVFJMR3eYiZ5ouEFKI",
  authDomain: "lucentra-2bfce.firebaseapp.com",
  databaseURL: "https://lucentra-2bfce-default-rtdb.firebaseio.com",
  projectId: "lucentra-2bfce",
  storageBucket: "lucentra-2bfce.firebasestorage.app",
  messagingSenderId: "267263088205",
  appId: "1:267263088205:web:c67abf1209030fc322ee04",
  measurementId: "G-GW4EVJ0WPV"
};

// const saveRoleToFirestore = async (uid: string, role: string) => {
//   try {
//     await setDoc(doc(db, "users", uid), { role });
//   } catch (error) {
//     console.error("Error writing document: ", error);
//   }
// };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


export { storage, ref, uploadBytesResumable, getDownloadURL, auth, db };
