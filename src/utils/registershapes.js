import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Registers a shape in Firestore under the correct classroom/project/team.
 *
 * @param {Object} newShape - The shape information.
 * @param {string} newShape.id - The unique shape ID.
 * @param {string} newShape.type - The type of shape (e.g., rectangle, circle).
 * @param {Object} userContext - The user’s context.
 * @param {string} userContext.className - The classroom ID.
 * @param {string} userContext.projectName - The project name.
 * @param {string} userContext.teamName - The team name.
 * @param {string} userContext.userId - The ID of the user adding the shape.
 * @returns {Promise<void>} A promise that resolves when the shape is successfully stored.
 */

export async function logAction(
  userContext,
  logMessage,
  userId,
  shapeId,
  shapeType,
  onLogged = () => {}
) {
  if (!userContext) {
    console.error("❌ Missing userContext");
  }
  if (!userId) {
    console.error("❌ Missing userId");
  }
  if (!logMessage) {
    console.error("❌ Missing logMessage");
  }

  if (!shapeId) {
    console.error("❌ Missing shapeId");
  }
  if (!shapeType) {
    console.error("❌ Missing shapeType");
  }
  if (!userContext || !userId || !logMessage || !shapeId || !shapeType) {
    console.error("❌ Aborting logAction due to missing parameters.");
    return;
  }

  const { className, projectName, teamName } = userContext;
  // console.log(
  //   `className = ${className} projectName = ${projectName} teamName= ${teamName}`
  // );

  const cleanAction = logMessage.replace(/\s+/g, "_").toLowerCase();

  const historyID = `${userId}_${cleanAction}_${shapeId}_${Date.now()}`;
  console.log("History Id === ", historyID);

  try {
    const historyRef = doc(
      db,
      `classrooms/${className}/Projects/${projectName}/teams/${teamName}/history/${historyID}`
    );

    const historyDoc = {
      action: logMessage,
      timestamp: serverTimestamp(),
      userId: userId,
      shapeId: shapeId,
      shapeType: shapeType || "unknown",
    };

    console.log(
      `---history doc --- ${historyDoc.action} --- ${historyDoc.userId} --- ${historyDoc.shapeType} --- ${historyDoc.timestamp}`
    );

    await setDoc(historyRef, historyDoc);

    console.log(`✅ Log added: ${logMessage}`);

    onLogged();
  } catch (error) {
    console.error(`Error adding log: ${error.message}`);
  }
}

export async function registerShape(newShape, userContext) {
  if (!newShape || !userContext) {
    console.error("❌ Missing shape data or user context.");
    return;
  }

  const { id: shapeID, type: shapeType, x, y, props } = newShape;
  const { className, projectName, teamName, userId } = userContext;

  if (
    !shapeID ||
    !shapeType ||
    !className ||
    !projectName ||
    !teamName ||
    !userId
  ) {
    console.error(
      "❌ Missing required fields: shapeID, shapeType, className, projectName, teamName, or userId."
    );
    return;
  }

  try {
    // Firestore path
    const shapeRef = doc(
      db,
      `classrooms/${className}/Projects/${projectName}/teams/${teamName}/shapes/${shapeID}`
    );

    const shapeDoc = {
      shapeId: shapeID,
      shapeType,
      position: { x, y },
      teamName: teamName,
      createdAt: serverTimestamp(),
      createdBy: userId,
      comments: [],
      reactions: {
        like: [],
        dislike: [],
        surprised: [],
        confused: [],
      },
    };

    // Store data in Firestore
    await setDoc(shapeRef, shapeDoc);
    console.log(`✅ Shape ${shapeID} successfully added to Firestore!`);

    await logAction(userContext, `added `, userId, newShape.id, newShape.type);
  } catch (error) {
    console.error("❌ Error adding shape to Firestore:", error);
  }
}

/**
 * Deletes a shape from Firestore.
 *
 * @param {string} shapeID - The unique ID of the shape to delete.
 * @param {Object} userContext - The user’s context (classroom, project, team).
 * @param {string} userContext.className - Classroom ID.
 * @param {string} userContext.projectName - Project Name.
 * @param {string} userContext.teamName - Team Name.
 * @returns {Promise<void>} A promise that resolves when the shape is deleted.
 */
export async function deleteShape(shapeID, userContext) {
  if (!shapeID || !userContext) {
    console.error("❌ Missing shape ID or user context.");
    return;
  }
  // const { id: shapeID, type: shapeType } = newShape;
  const { className, projectName, teamName, userId } = userContext;

  try {
    // Firestore document reference
    const shapeRef = doc(
      db,
      `classrooms/${className}/Projects/${projectName}/teams/${teamName}/shapes/${shapeID}`
    );

    // Delete document
    await deleteDoc(shapeRef);
    console.log(`🗑️ Shape ${shapeID} successfully deleted from Firestore.`);
    await logAction(userContext, `deleted`, userId, shapeID, shapeType);
  } catch (error) {
    console.error("❌ Error deleting shape from Firestore:", error);
  }
}
