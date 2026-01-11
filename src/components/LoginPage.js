// // import React, { useState, useEffect } from "react";
// // // import { initializeApp } from "firebase/app";
// // import {
// //   getAuth,
// //   GoogleAuthProvider,
// //   signInWithPopup,
// //   signInWithEmailAndPassword,
// //   sendPasswordResetEmail,
// //   createUserWithEmailAndPassword,
// //   sendEmailVerification,
// // } from "firebase/auth";
// // import {
// //   getFirestore,
// //   doc,
// //   getDoc,
// //   setDoc,
// //   serverTimestamp,
// // } from "firebase/firestore";
// // import { useNavigate } from "react-router-dom";
// // import { useFlashMessage } from "../FlashMessageContext"; // Import the flash message hook
// // import "bootstrap/dist/css/bootstrap.min.css";
// // import "bootstrap-icons/font/bootstrap-icons.css";
// // // import firebaseConfig from "../firebaseConfig";
// // import { app, db, auth, googleProvider, storage } from "../firebaseConfig";
// // import {
// //   sendSignInLinkToEmail,
// //   isSignInWithEmailLink,
// //   signInWithEmailLink,
// // } from "firebase/auth";
// // import { Password } from "@mui/icons-material";

// // // Firebase configuration

// // // Initialize Firebase
// // // const app = initializeApp(firebaseConfig);
// // // const auth = getAuth(app);
// // // const provider = new GoogleAuthProvider();
// // // const db = getFirestore(app);

// // const ALLOWED_EMAILS = new Set(["ntotar1@lsu.edu"]);

// // const LoginPage = () => {
// //   const [message, setMessage] = useState(null);
// //   const navigate = useNavigate();
// //   const addMessage = useFlashMessage();

// //   const [email, setEmail] = useState("");
// //   const [password, setPassword] = useState("");
// //   const [showPwd, setShowPwd] = useState(false);
// //   const [signingIn, setSigningIn] = useState(false);
// //   const [isSignup, setIsSignup] = useState(false);
// //   // const [confirmPwd, setConfirmPwd] = useState(false);
// //   const [confirmPwd, setConfirmPwd] = useState("");

// //   const toLSU = (s) => (s || "").trim().toLowerCase();

// //   // Add 'login-page' class to the body when the component mounts
// //   useEffect(() => {
// //     document.body.classList.add("login-page");
// //     return () => {
// //       document.body.classList.remove("login-page");
// //     };
// //   }, []);

// //   const handleEmailPasswordSignIn = async () => {
// //     const userEmail = toLSU(email);

// //     // Optional domain guard
// //     if (!userEmail.endsWith("@lsu.edu")) {
// //       addMessage("danger", "Only LSU email addresses are allowed.");
// //       return;
// //     }
// //     if (!password) {
// //       addMessage("danger", "Please enter your password.");
// //       return;
// //     }

// //     try {
// //       setSigningIn(true);

// //       // 1) Firebase Auth sign-in
// //       const cred = await signInWithEmailAndPassword(auth, userEmail, password);
// //       await cred.user.reload();
// //       // if (!cred.user.emailVerified) {
// //       //   await auth.signOut();
// //       //   ["role", "userEmail", "photoURL", "LSUID"].forEach((k) =>
// //       //     localStorage.removeItem(k)
// //       //   );
// //       //   addMessage(
// //       //     "danger",
// //       //     "Please verify your email first. We sent a verification link to your inbox."
// //       //   );
// //       //   return;
// //       // }
// //       const authedEmail = cred.user.email;

// //       // 2) Fetch role/profile from Firestore
// //       const userSnap = await getDoc(doc(db, "users", authedEmail));
// //       if (!userSnap.exists()) {
// //         addMessage(
// //           "danger",
// //           "User profile not found. Please contact your instructor."
// //         );
// //         return;
// //       }

// //       const u = userSnap.data();
// //       const role = (u.role || "student").toLowerCase();
// //       const LSUID = u.lsuID || null;
// //       const photoURL = u.photoURL || cred.user.photoURL || "";

// //       // 3) Store locally
// //       localStorage.setItem("role", role);
// //       localStorage.setItem("userEmail", authedEmail);
// //       if (photoURL) localStorage.setItem("photoURL", photoURL);
// //       if (LSUID) localStorage.setItem("LSUID", LSUID);

// //       addMessage("success", `Welcome, ${u.firstName || authedEmail}!`);
// //       navigate(role === "teacher" ? "/teachers-home" : "/students-home");
// //     } catch (err) {
// //       // Friendly Firebase error mapping
// //       const code = err?.code || "";
// //       if (
// //         code === "auth/invalid-credential" ||
// //         code === "auth/wrong-password"
// //       ) {
// //         addMessage("danger", "Incorrect email or password.");
// //       } else if (code === "auth/user-not-found") {
// //         addMessage("danger", "No account found for this email.");
// //       } else if (code === "auth/too-many-requests") {
// //         addMessage("danger", "Too many attempts. Try again later.");
// //       } else {
// //         console.error(err);
// //         addMessage("danger", "Sign-in failed. Please try again.");
// //       }
// //     } finally {
// //       setSigningIn(false);
// //     }
// //   };

// //   const handleForgotPassword = async () => {
// //     const userEmail = toLSU(email);
// //     if (!userEmail) {
// //       addMessage("info", "Enter your email first, then click Forgot Password.");
// //       return;
// //     }
// //     try {
// //       await sendPasswordResetEmail(auth, userEmail);
// //       addMessage("info", "Password reset email sent. Check your inbox.");
// //     } catch (e) {
// //       console.error(e);
// //       addMessage("danger", "Could not send reset email.");
// //     }
// //   };

// //   const handleSignUp = async () => {
// //     const userEmail = toLSU(email);

// //     // if (!userEmail.endsWith("@lsu.edu")){
// //     //   addMessage("danger","Only LSU email addresses are allowed.")
// //     // }

// //     if (!password || password.length < 5) {
// //       addMessage("danger", "Password must be at least 5 characters.");
// //     }

// //     if (password !== confirmPwd) {
// //       addMessage("danger", "Password do not match");
// //       return;
// //     }

// //     try {
// //       setSigningIn(true);
// //       const cred = await createUserWithEmailAndPassword(
// //         auth,
// //         userEmail,
// //         password
// //       );

// //       // await sendEmailVerification(cred.user);
// //       // await sendEmailVerification(
// //       //   cred.user /*, { url: "https://polyflux-platform.vercel.app" }*/
// //       // );
// //       addMessage("success", "Account created successfully!");
// //       // addMessage(
// //       //   "info",
// //       //   "Verification email sent. Please verify your email address."
// //       // );

// //       const authedEmail = cred.user.email;

// //       //creating firebase profile
// //       const userRef = doc(db, "users", authedEmail);
// //       const snap = await getDoc(userRef);
// //       if (!snap.exists()) {
// //         await setDoc(userRef, {
// //           email: authedEmail,
// //           role: "student",
// //           firstName: "",
// //           photoURL: cred.user.photoURL || "",
// //           createdAt: serverTimestamp(),
// //           lastLoginAt: serverTimestamp(),
// //         });
// //       }

// //       // const profile = (await getDoc(userRef)).data() || {};
// //       // const role = (profile.role || "student").toLowerCase();

// //       // localStorage.setItem("role", role);
// //       // localStorage.setItem("userEmail", authedEmail);
// //       // if (profile.photoURL) localStorage.setItem("photoURL", profile.photoURL);

// //       // addMessage(
// //       //   "info",
// //       //   "Verification email sent. Please verify your address, then sign in."
// //       // );
// //       await auth.signOut();

// //       // navigate("/verify-email", { state: { email: authedEmail } });
// //       navigate("/account-created", { state: { email: authedEmail } });

// //       // addMessage("success", "Account created! Welcome aboard.");
// //       // navigate(role === "teacher" ? "/teachers-home" : "/students-home");
// //     } catch (err) {
// //       console.log(err);
// //       const code = err.code || "";
// //       // if (code === "auth/email-already-in-use") {
// //       //   addMessage("danger", "An account already exists for this email.");
// //       // } else
// //       if (code === "auth/invalid-email") {
// //         addMessage("danger", "Invalid email address.");
// //       } else if (code === "auth/weak-password") {
// //         addMessage("danger", "Password is too weak.");
// //       } else {
// //         addMessage("danger", "Sign-up failed. Please try again.");
// //       }
// //     } finally {
// //       setSigningIn(false);
// //     }
// //   };

// //   const handleEmailSignIn = async () => {
// //     if (!email.endsWith("@lsu.edu")) {
// //       addMessage("danger", "Only LSU email addresses are allowed.");
// //       return;
// //     }

// //     const actionCodeSettings = {
// //       // url: "https://colla-board.vercel.app//finishSignIn", // Adjust for deployed domain later
// //       url: "https://polyflux-platform.vercel.app/finishSignIn",
// //       handleCodeInApp: true,
// //     };

// //     try {
// //       await sendSignInLinkToEmail(auth, email, actionCodeSettings);
// //       window.localStorage.setItem("emailForSignIn", email);
// //       addMessage("info", "Sign-in link sent. Check your LSU email.");
// //     } catch (error) {
// //       console.error("Email sign-in failed:", error);
// //       addMessage("danger", "Could not send sign-in link. Please try again.");
// //     }
// //   };

// //   const googleLogin = async () => {
// //     try {
// //       const result = await signInWithPopup(auth, googleProvider);
// //       console.log("Google sign-in successful:", result);
// //       const user = result.user;
// //       const userEmail = user.email;
// //       const userName = user.displayName;
// //       const photoURL = user.photoURL;

// //       // Fetch role & LSUID from Firestore
// //       const userDoc = await getDoc(doc(db, "users", userEmail));
// //       if (!userDoc.exists()) {
// //         // Use flash message to alert user not found
// //         addMessage("danger", "User not found in the database.");
// //         return;
// //       }

// //       const userData = userDoc.data();
// //       const role = userData.role;
// //       const LSUID = userData.lsuID || null; // Ensure LSUID is retrieved

// //       // Store user data in localStorage
// //       localStorage.setItem("role", role);
// //       localStorage.setItem("userEmail", userEmail);
// //       localStorage.setItem("photoURL", photoURL);
// //       if (LSUID) {
// //         localStorage.setItem("LSUID", LSUID);
// //       }

// //       // Debugging Logs
// //       console.log("User Email:", userEmail);
// //       console.log("User Role:", role);
// //       console.log("LSUID:", LSUID);

// //       // Show welcome flash message in the top right corner
// //       addMessage("success", `Welcome, ${userName}!`);

// //       // Navigate based on role
// //       navigate(role === "teacher" ? "/teachers-home" : "/students-home");
// //     } catch (error) {
// //       console.error("Google login failed:", error);
// //       addMessage("danger", "Google login failed. Please try again.");
// //     }
// //   };

// //   const handleDirectEmailSignIn = async () => {
// //     const raw = (email || "").trim().toLowerCase();

// //     if (!ALLOWED_EMAILS.has(raw)) {
// //       addMessage("danger", "This email is not allowed for direct sign-in.");
// //       return;
// //     }

// //     try {
// //       // Look up user in Firestore
// //       const snap = await getDoc(doc(db, "users", raw));
// //       if (!snap.exists()) {
// //         addMessage("danger", "User not found in the database.");
// //         return;
// //       }

// //       const data = snap.data();
// //       const role = (data.role || "student").toLowerCase();
// //       const LSUID = data.lsuID || null;
// //       const photoURL = data.photoURL || ""; // if you stored one

// //       // Persist like Google sign-in does
// //       localStorage.setItem("role", role);
// //       localStorage.setItem("userEmail", raw);
// //       if (photoURL) localStorage.setItem("photoURL", photoURL);
// //       if (LSUID) localStorage.setItem("LSUID", LSUID);

// //       addMessage("success", `Welcome, ${data.firstName || raw}!`);
// //       navigate(role === "teacher" ? "/teachers-home" : "/students-home");
// //     } catch (err) {
// //       console.error(err);
// //       addMessage("danger", "Direct sign-in failed. Please try again.");
// //     }
// //   };

// //   return (
// //     <div
// //       className="d-flex justify-content-center align-items-center min-vh-100"
// //       // style={{ backgroundColor: "#f0f0f0" }}
// //       style={{
// //         backgroundImage: 'url("/body-bg3.png")',
// //         backgroundSize: "cover",
// //         backgroundPosition: "center",
// //       }}
// //     >
// //       <div className="login-container p-4 bg-white rounded shadow text-center">
// //         <h2
// //           className="mb-4"
// //           style={{ fontWeight: 700, fontSize: "28px", color: "#333" }}
// //         >
// //           {isSignup ? "Create your PolyFlux account" : "Welcome to PolyFlux"}
// //           {/* Welcome to PolyFlux */}
// //         </h2>
// //         <img
// //           src="/logo.png"
// //           alt="App logo"
// //           style={{ width: "150px", marginBottom: "20px" }}
// //         />

// //         {/* <h2 className="text-center mb-4">PolyFlux</h2> */}

// //         <p className="mb-4 text-muted">Collaborate. Create. Reflect.</p>

// //         {/* Local flash messages (if any) */}
// //         {message && (
// //           <div
// //             className={`alert ${
// //               message.includes("failed") ? "alert-danger" : "alert-info"
// //             }`}
// //             role="alert"
// //           >
// //             <strong>{message}</strong>
// //           </div>
// //         )}

// //         <div className="mt-4">
// //           {/* Email */}
// //           <input
// //             className="form-control mb-2"
// //             type="email"
// //             value={email}
// //             onChange={(e) => setEmail(e.target.value)}
// //             placeholder={
// //               isSignup
// //                 ? "Enter a sign up email address (eg. abc1@lsu.edu)"
// //                 : "Your email address"
// //             }
// //             required
// //           />

// //           {/* Password */}
// //           <div className="input-group">
// //             <input
// //               style={{ borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
// //               className="form-control mb-2"
// //               type={showPwd ? "text" : "password"}
// //               value={password}
// //               onChange={(e) => setPassword(e.target.value)}
// //               placeholder={
// //                 isSignup
// //                   ? "Create a password (min 5 chars)"
// //                   : "Enter your password"
// //               }
// //               required
// //             />
// //             <span
// //               className="password-toggle"
// //               onClick={() => setShowPwd((s) => !s)}
// //               title={showPwd ? "Hide password" : "Show password"}
// //               style={{
// //                 position: "absolute",
// //                 right: "8px",
// //                 top: "40%",
// //                 transform: "translateY(-50%)",
// //                 cursor: "pointer",
// //                 color: "#667085",
// //                 fontSize: "1.1rem",
// //                 transition: "color 0.2s ease",
// //               }}
// //             >
// //               <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
// //             </span>
// //           </div>

// //           {isSignup && (
// //             <div className="input-group mb-2">
// //               <input
// //                 className="form-control mb-2"
// //                 type={showPwd ? "text" : "password"}
// //                 value={confirmPwd}
// //                 onChange={(e) => setConfirmPwd(e.target.value)}
// //                 placeholder="Confirm your password"
// //                 required
// //               />
// //               <span
// //                 className="password-toggle"
// //                 onClick={() => setShowPwd((s) => !s)}
// //                 title={showPwd ? "Hide password" : "Show password"}
// //                 style={{
// //                   position: "absolute",
// //                   right: "8px",
// //                   top: "45%",
// //                   transform: "translateY(-50%)",
// //                   cursor: "pointer",
// //                   color: "#667085",
// //                   fontSize: "1.1rem",
// //                   transition: "color 0.2s ease",
// //                 }}
// //               >
// //                 <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
// //               </span>
// //             </div>
// //           )}

// //           {/* Submit */}
// //           <button
// //             className="btn btn-primary w-100"
// //             // onClick={handleEmailPasswordSignIn}
// //             onClick={isSignup ? handleSignUp : handleEmailPasswordSignIn}
// //             disabled={signingIn}
// //           >
// //             {/* {signingIn ? "Signing in..." : "Sign In with Email"} */}
// //             {signingIn
// //               ? isSignup
// //                 ? "Creating..."
// //                 : "Signing in..."
// //               : isSignup
// //               ? "Create Account"
// //               : "Sign In"}
// //           </button>

// //           {/* <p className="mb-3 text-muted">
// //             {isSignup ? "Create your PolyFlux account" : "Ready to co-create!"}
// //           </p> */}

// //           {/* Forgot password (hide during signup mode to reduce clutter) */}
// //           {!isSignup && (
// //             <button
// //               className="btn btn-link w-100 mt-2"
// //               type="button"
// //               onClick={handleForgotPassword}
// //             >
// //               Forgot password?
// //             </button>
// //           )}

// //           <button
// //             type="button"
// //             className="btn btn-link w-100 mt-1"
// //             onClick={() => {
// //               setIsSignup((s) => !s);
// //               setConfirmPwd("");
// //             }}
// //           >
// //             {isSignup
// //               ? "Have an account? Sign in"
// //               : "New here? Create an account"}
// //           </button>

// //           {/* Divider */}
// //           <div className="d-flex align-items-center my-3">
// //             <div className="flex-grow-1 border-top" />
// //             <span className="px-2 text-muted" style={{ fontSize: 12 }}>
// //               or
// //             </span>
// //             <div className="flex-grow-1 border-top" />
// //           </div>

// //           {/* Forgot password */}
// //           {/* <button
// //             className="btn btn-link w-100 mt-2"
// //             type="button"
// //             onClick={handleForgotPassword}
// //           >
// //             Forgot password?
// //           </button> */}

// //           {/* (Optional) Keep your magic-link button if you like */}
// //           {/* <button className="btn btn-outline-secondary w-100 mt-2" onClick={handleEmailSignIn}>
// //     Send Sign-In Link
// //   </button> */}
// //         </div>

// //         <div className="mb-3">
// //           {/* Google Login Button - Centered */}
// //           <div className="d-flex justify-content-center">
// //             <button className="googlebutton" onClick={googleLogin}>
// //               <svg
// //                 xmlns="http://www.w3.org/2000/svg"
// //                 preserveAspectRatio="xMidYMid"
// //                 viewBox="0 0 256 262"
// //               >
// //                 <path
// //                   fill="#4285F4"
// //                   d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
// //                 ></path>
// //                 <path
// //                   fill="#34A853"
// //                   d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
// //                 ></path>
// //                 <path
// //                   fill="#FBBC05"
// //                   d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
// //                 ></path>
// //                 <path
// //                   fill="#EB4335"
// //                   d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
// //                 ></path>
// //               </svg>
// //               Login with Google
// //             </button>
// //           </div>

// //           {/* <div className="mt-4">
// //             <input
// //               className="form-control mb-2"
// //               type="email"
// //               value={email}
// //               onChange={(e) => setEmail(e.target.value)}
// //               placeholder="Enter your LSU email (e.g., abc1@lsu.edu)"
// //             />

// //             <button
// //               className="btn btn-outline-secondary w-100 mt-2"
// //               onClick={handleDirectEmailSignIn}
// //               title="Direct sign-in (checks Firestore and signs you in)"
// //             >
// //               Sign In with Email
// //             </button>
// //           </div> */}

// //           {/* <div className="mt-4">
// //             <input
// //               className="form-control mb-2"
// //               type="email"
// //               value={email}
// //               onChange={(e) => setEmail(e.target.value)}
// //               placeholder="Enter your LSU email"
// //             />
// //             <button onClick={handleEmailSignIn}>Send Sign-In Link</button>
// //             <button
// //               className="btn btn-primary w-100"
// //               onClick={handleEmailSignIn}
// //             >
// //               Send Sign-In Link
// //             </button>
// //           </div> */}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default LoginPage;

// //////////////////////////
// //////////////////////////
// //////////////////////////
// //////////////////////////
// //////////////////////////
// //////////////////////////
// //////////////////////////

// // sign in using email and display name only
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import "bootstrap/dist/css/bootstrap.min.css";
// import "bootstrap-icons/font/bootstrap-icons.css";

// import { db } from "../firebaseConfig";
// import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
// import { useFlashMessage } from "../FlashMessageContext";

// const LoginPage = () => {
//   const navigate = useNavigate();
//   const addMessage = useFlashMessage();

//   const [email, setEmail] = useState("");
//   const [displayName, setDisplayName] = useState("");
//   const [signingIn, setSigningIn] = useState(false);

//   // Keep the nice background class
//   useEffect(() => {
//     document.body.classList.add("login-page");
//     return () => {
//       document.body.classList.remove("login-page");
//     };
//   }, []);

//   const normalizeEmail = (s) => (s || "").trim().toLowerCase();

//   // const handleLogin = async () => {
//   //   const userEmail = normalizeEmail(email);
//   //   const name = (displayName || "").trim();

//   //   if (!userEmail) {
//   //     addMessage("danger", "Please enter your email address.");
//   //     return;
//   //   }
//   //   if (!name) {
//   //     addMessage("danger", "Please enter your display name or ID.");
//   //     return;
//   //   }

//   //   try {
//   //     setSigningIn(true);

//   //     // /users/<email>
//   //     const userRef = doc(db, "users", userEmail);
//   //     const snap = await getDoc(userRef);

//   //     if (snap.exists()) {
//   //       // Existing user: update the display name
//   //       await setDoc(
//   //         userRef,
//   //         {
//   //           name,
//   //           updatedAt: serverTimestamp(),
//   //         },
//   //         { merge: true }
//   //       );
//   //     } else {
//   //       // New user: create with role: "student"
//   //       await setDoc(userRef, {
//   //         email: userEmail,
//   //         name,
//   //         role: "student",
//   //         createdAt: serverTimestamp(),
//   //       });
//   //     }

//   //     addMessage("success", `Welcome, ${name}!`);
//   //     navigate("/students-home");
//   //   } catch (err) {
//   //     console.error("Login error:", err);
//   //     addMessage(
//   //       "danger",
//   //       "Could not save your information. Please try again."
//   //     );
//   //   } finally {
//   //     setSigningIn(false);
//   //   }
//   // };

//   const handleLogin = async () => {
//     const userEmail = normalizeEmail(email);
//     const name = (displayName || "").trim();

//     if (!userEmail) {
//       addMessage("danger", "Please enter your email address.");
//       return;
//     }
//     if (!name) {
//       addMessage("danger", "Please enter your display name or ID.");
//       return;
//     }

//     try {
//       setSigningIn(true);

//       // /users/<email>
//       const userRef = doc(db, "users", userEmail);
//       const snap = await getDoc(userRef);

//       let roleFromDb = "student"; // default

//       if (snap.exists()) {
//         const data = snap.data() || {};
//         roleFromDb = (data.role || "student").toLowerCase();

//         // Existing user: update the display name
//         await setDoc(
//           userRef,
//           {
//             name,
//             updatedAt: serverTimestamp(),
//           },
//           { merge: true }
//         );
//       } else {
//         // New user: create with role: "student"
//         roleFromDb = "student";
//         await setDoc(userRef, {
//           email: userEmail,
//           name,
//           role: roleFromDb,
//           createdAt: serverTimestamp(),
//         });
//       }

//       // Persist for the rest of the app (TeacherOnlyRoute uses this)
//       localStorage.setItem("role", roleFromDb);
//       localStorage.setItem("userEmail", userEmail);
//       localStorage.setItem("displayName", name);

//       addMessage("success", `Welcome, ${name}!`);

//       // 🔀 Navigate based on role
//       if (roleFromDb === "teacher" || roleFromDb === "admin") {
//         navigate("/teachers-home");
//       } else {
//         navigate("/students-home");
//       }
//     } catch (err) {
//       console.error("Login error:", err);
//       addMessage(
//         "danger",
//         "Could not save your information. Please try again."
//       );
//     } finally {
//       setSigningIn(false);
//     }
//   };

//   return (
//     <div
//       className="d-flex justify-content-center align-items-center min-vh-100"
//       style={{
//         backgroundImage: 'url("/body-bg3.png")',
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       <div className="login-container p-4 bg-white rounded shadow text-center">
//         <h2
//           className="mb-4"
//           style={{ fontWeight: 700, fontSize: "28px", color: "#333" }}
//         >
//           Welcome to PolyFlux
//         </h2>

//         <img
//           src="/logo.png"
//           alt="App logo"
//           style={{ width: "150px", marginBottom: "20px" }}
//         />

//         <p className="mb-4 text-muted">Collaborate. Create. Reflect.</p>

//         {/* Email input */}
//         <input
//           className="form-control mb-2"
//           type="email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           placeholder="Your email address"
//           required
//         />

//         {/* Display name / ID input */}
//         <input
//           className="form-control mb-3"
//           type="text"
//           value={displayName}
//           onChange={(e) => setDisplayName(e.target.value)}
//           placeholder="Your display name or ID"
//           required
//         />

//         <button
//           className="btn btn-primary w-100"
//           onClick={handleLogin}
//           disabled={signingIn}
//         >
//           {signingIn ? "Logging in..." : "Log In"}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;

import React, { useState, useEffect } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useFlashMessage } from "../FlashMessageContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { db, auth, googleProvider } from "../firebaseConfig";

const LoginPage = () => {
  const [message, setMessage] = useState(null); // optional local messages
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantId, setParticipantId] = useState("");

  const navigate = useNavigate();
  const addMessage = useFlashMessage();

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  const participantQuickLogin = async (e) => {
    e.preventDefault();

    const normalizedEmail = participantEmail.trim().toLowerCase();
    const pid = participantId.trim();

    if (!normalizedEmail || !pid) {
      addMessage("danger", "Please enter both email and Participant ID.");
      return;
    }

    try {
      // 1) Verify participant exists in Firestore
      const userRef = collection(db, "users");
      const q = query(userRef, where("email", "==", normalizedEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        addMessage(
          "danger",
          "Not found. Please check your email and Participant ID."
        );
        return;
      }

      // ✅ the exact matched user document
      const userDocSnap = snap.docs[0];
      const userData = userDocSnap.data();

      localStorage.setItem(
        "role",
        (userData.role || "participant").toLowerCase()
      );
      localStorage.setItem("userEmail", normalizedEmail);
      localStorage.setItem("userDisplayName", pid);

      // ✅ 1.5) Update the user's display name to the participant ID (P1, P2, ...)
      await updateDoc(userDocSnap.ref, {
        name: pid,
        updatedAt: serverTimestamp(),
        lastParticipantId: pid,
      });

      // 2) Sign in via Firebase Auth (fastest: anonymous)
      const anonRes = await signInAnonymously(auth);
      const uid = anonRes.user.uid;

      await updateProfile(anonRes.user, { displayName: pid });

      await setDoc(doc(db, "participantSessions", uid), {
        uid,
        email: normalizedEmail,
        participantId: pid,
        role: userData.role || "participant",
        studyId: userData.studyId || "evaluation",
        taskName: userData.taskName || "Plan a vacation in United States",
        teamId: userData.teamId || "TeamA",
        createdAt: serverTimestamp(),
      });

      addMessage("success", "Welcome! Redirecting to the whiteboard...");

      const studyId = userData.studyId || "evaluation";
      const taskName = userData.taskName || "Plan a vacation in United States";
      const teamId = userData.teamId || "TeamA";

      navigate(
        `/whiteboard/${encodeURIComponent(studyId)}/${encodeURIComponent(
          taskName
        )}/${encodeURIComponent(teamId)}`
      );
    } catch (err) {
      console.error("Participant quick login failed:", err);
      addMessage("danger", "Login failed. Please try again.");
    }
  };

  const handleProfileAndRedirect = async (user) => {
    const userEmail = (user.email || "").trim().toLowerCase();
    const userName = (user.displayName || userEmail).trim();
    const photoURL = user.photoURL || "";

    // OPTIONAL: enforce LSU domain at auth level
    // if (!userEmail.toLowerCase().endsWith("@lsu.edu")) {
    //   addMessage(
    //     "danger",
    //     "Only LSU email accounts are allowed. Please use your LSU email."
    //   );
    //   await auth.signOut();
    //   return;
    // }

    // Fetch profile from Firestore
    const userDocRef = doc(db, "users", userEmail);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      addMessage(
        "danger",
        "Your account is not registered in the system. Please contact the instructor."
      );
      await auth.signOut();
      return;
    }

    const userData = userDoc.data();
    const role = userData.role;
    const LSUID = userData.lsuID || null;

    // Store profile locally
    localStorage.setItem("role", role);
    localStorage.setItem("userEmail", userEmail);
    localStorage.setItem("userDisplayName", userName);
    if (photoURL) localStorage.setItem("photoURL", photoURL);
    if (LSUID) localStorage.setItem("LSUID", LSUID);

    console.log("Signed in with Firestore profile:", {
      userEmail,
      role,
      LSUID,
    });

    addMessage("success", `Welcome, ${userName}!`);
    navigate(role === "teacher" ? "/teachers-home" : "/students-home");
  };

  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleProfileAndRedirect(result.user);
    } catch (error) {
      console.error("Google login failed:", error);
      addMessage("danger", "Google login failed. Please try again.");
    }
  };

  const emailPasswordLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleProfileAndRedirect(result.user);
    } catch (error) {
      console.error("Email/password login failed:", error);

      let msg = "Login failed. Please check your email and password.";
      if (error.code === "auth/user-not-found") {
        msg = "No account found for this email.";
      } else if (error.code === "auth/wrong-password") {
        msg = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      }

      addMessage("danger", msg);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        backgroundImage: 'url("/body-bg3.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="login-container p-4 bg-white rounded shadow text-center">
        <h2
          className="mb-4"
          style={{ fontWeight: 700, fontSize: "28px", color: "#333" }}
        >
          Welcome to PolyFlux
        </h2>
        <img
          src="/logo.png"
          alt="App logo"
          style={{ width: "150px", marginBottom: "20px" }}
        />

        <p className="mb-4 text-muted">Collaborate. Create. Reflect.</p>

        {/* Local flash messages (if you still use `message` state here) */}
        {message && (
          <div
            className={`alert ${
              message.includes("failed") ? "alert-danger" : "alert-info"
            }`}
            role="alert"
          >
            <strong>{message}</strong>
          </div>
        )}

        {/* Google login */}
        <div className="mb-3">
          <div className="d-flex justify-content-center">
            <button className="googlebutton" onClick={googleLogin}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid"
                viewBox="0 0 256 262"
              >
                <path
                  fill="#4285F4"
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                ></path>
                <path
                  fill="#34A853"
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                ></path>
                <path
                  fill="#EB4335"
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                ></path>
              </svg>
              Login with Google
            </button>
          </div>
        </div>

        {/* Small link to reveal email/password form */}
        {/* {!showEmailForm && (
          <button
            type="button"
            className="btn btn-link mt-2 p-0"
            onClick={() => setShowEmailForm(true)}
          >
            Sign in with email instead
          </button>
        )} */}

        {/* Email/password login: only visible after clicking the link */}
        {showEmailForm && (
          <>
            {/* Divider */}
            <div className="d-flex align-items-center my-3">
              <hr className="flex-grow-1" />
              <span className="mx-2 text-muted">OR</span>
              <hr className="flex-grow-1" />
            </div>

            <form onSubmit={emailPasswordLogin}>
              <div className="mb-2 text-start">
                <label className="form-label mb-1">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="yourname@lsu.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3 text-start">
                <label className="form-label mb-1">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                Login with Email
              </button>
            </form>
          </>
        )}

        {/* Small link to reveal participant quick login */}
        {!showParticipantForm && (
          <button
            type="button"
            className="btn btn-link mt-2 p-0"
            onClick={() => setShowParticipantForm(true)}
          >
            Participant quick login
          </button>
        )}

        {showParticipantForm && (
          <>
            <div className="d-flex align-items-center my-3">
              <hr className="flex-grow-1" />
              <span className="mx-2 text-muted">OR</span>
              <hr className="flex-grow-1" />
            </div>

            <form onSubmit={participantQuickLogin}>
              <div className="mb-2 text-start">
                <label className="form-label mb-1">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="yourname@lsu.edu"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3 text-start">
                <label className="form-label mb-1">Participant ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., P014"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-dark w-100">
                Go to Whiteboard
              </button>

              <button
                type="button"
                className="btn btn-link mt-2 p-0"
                onClick={() => setShowParticipantForm(false)}
              >
                Cancel
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
