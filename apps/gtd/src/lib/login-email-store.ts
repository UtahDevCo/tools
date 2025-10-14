import {
  createCollection,
  localStorageCollectionOptions,
  useLiveQuery,
} from "@tanstack/react-db";
import { useCallback } from "react";
import { z } from "zod";

const STORAGE_KEY = "login-email";

const loginEmailSchema = z.object({
  id: z.string(),
  email: z.string(),
});

type LoginEmailData = z.infer<typeof loginEmailSchema>;

export const loginEmailCollection = createCollection(
  localStorageCollectionOptions({
    id: "login-email",
    storageKey: "gtd-login-email",
    getKey: (item: LoginEmailData) => item.id,
  })
);

export function useLoginEmail() {
  const { data } = useLiveQuery(loginEmailCollection);
  const loginEmail = (data?.[0] as LoginEmailData | undefined)?.email ?? "";

  const setLoginEmail = useCallback((email: string) => {
    const existing = loginEmailCollection.toArray.find(
      (item: LoginEmailData) => item.id === STORAGE_KEY
    );

    if (existing) {
      loginEmailCollection.update(STORAGE_KEY, (draft) => {
        (draft as LoginEmailData).email = email;
      });
    } else {
      loginEmailCollection.insert({ id: STORAGE_KEY, email } as LoginEmailData);
    }
  }, []);

  return [loginEmail, setLoginEmail] as const;
}
