import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteObject: vi.fn(),
  getIdToken: vi.fn(),
  uploadBytes: vi.fn(),
  user: { uid: "firebase-user-1" },
}));

vi.mock("@/lib/firebase", () => ({
  firebaseAuth: {
    currentUser: { uid: mocks.user.uid, getIdToken: mocks.getIdToken },
  },
  firebaseStorage: {},
}));

vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn(),
}));

vi.mock("firebase/storage", () => ({
  deleteObject: mocks.deleteObject,
  ref: (_storage: unknown, path: string) => ({ path }),
  uploadBytes: mocks.uploadBytes,
}));

import { uploadAssessmentImages } from "@/lib/firebase-storage";

describe("Firebase image storage", () => {
  beforeEach(() => {
    mocks.deleteObject.mockReset().mockResolvedValue(undefined);
    mocks.getIdToken.mockReset().mockResolvedValue("firebase-id-token");
    mocks.uploadBytes.mockReset().mockResolvedValue({});
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("2e70e1d4-9195-44f2-a454-71b8fc07d333")
      .mockReturnValueOnce("0f9e58ce-3872-4317-8e0a-8c84fb73062c")
      .mockReturnValueOnce("d5d7a429-2fb8-4f54-a9e1-3807692e533d");
  });

  it("uploads to a UID-scoped batch and returns only object metadata", async () => {
    const files = [
      new File([new Uint8Array([1])], "first.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array([2])], "second.png", { type: "image/png" }),
    ];

    const result = await uploadAssessmentImages(files);

    expect(result.idToken).toBe("firebase-id-token");
    expect(result.images.map((image) => image.object_path)).toEqual([
      "users/firebase-user-1/uploads/2e70e1d4-9195-44f2-a454-71b8fc07d333/0f9e58ce-3872-4317-8e0a-8c84fb73062c.jpg",
      "users/firebase-user-1/uploads/2e70e1d4-9195-44f2-a454-71b8fc07d333/d5d7a429-2fb8-4f54-a9e1-3807692e533d.png",
    ]);
    expect(mocks.uploadBytes).toHaveBeenCalledTimes(2);
  });

  it("removes completed objects when a later upload fails", async () => {
    mocks.uploadBytes
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("upload failed"));
    const files = [
      new File([new Uint8Array([1])], "first.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array([2])], "second.png", { type: "image/png" }),
    ];

    await expect(uploadAssessmentImages(files)).rejects.toThrow("upload failed");

    expect(mocks.deleteObject).toHaveBeenCalledWith({
      path: "users/firebase-user-1/uploads/2e70e1d4-9195-44f2-a454-71b8fc07d333/0f9e58ce-3872-4317-8e0a-8c84fb73062c.jpg",
    });
  });
});
