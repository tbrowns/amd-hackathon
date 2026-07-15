import { signInAnonymously, type User } from "firebase/auth";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { firebaseAuth, firebaseStorage } from "@/lib/firebase";

export interface FirebaseImageReference {
  object_path: string;
  content_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: number;
}

export interface FirebaseUploadSession {
  idToken: string;
  images: FirebaseImageReference[];
}

let pendingSignIn: Promise<User> | null = null;

async function currentUser(): Promise<User> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  pendingSignIn ??= signInAnonymously(firebaseAuth).then((credential) => credential.user);
  try {
    return await pendingSignIn;
  } finally {
    pendingSignIn = null;
  }
}

function extensionFor(contentType: File["type"]): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  throw new Error("Only JPEG, PNG, and WebP images can be uploaded.");
}

export async function uploadAssessmentImages(files: File[]): Promise<FirebaseUploadSession> {
  const user = await currentUser();
  const batchId = crypto.randomUUID();
  const images: FirebaseImageReference[] = [];
  try {
    for (const file of files) {
      const contentType = file.type as FirebaseImageReference["content_type"];
      const objectPath = `users/${user.uid}/uploads/${batchId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
      await uploadBytes(ref(firebaseStorage, objectPath), file, {
        cacheControl: "private, no-store",
        contentType,
      });
      images.push({
        object_path: objectPath,
        content_type: contentType,
        size_bytes: file.size,
      });
    }
  } catch (error) {
    await deleteUploadedImages(images);
    throw error;
  }
  return { idToken: await user.getIdToken(), images };
}

export async function deleteUploadedImages(images: FirebaseImageReference[]): Promise<void> {
  await Promise.allSettled(
    images.map((image) => deleteObject(ref(firebaseStorage, image.object_path))),
  );
}
