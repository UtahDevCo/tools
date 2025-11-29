"use client";

import localforage from "localforage";
import { useCallback, useEffect, useState } from "react";

import { structuredCloneWithFallback, wait } from "../lib/utils";

type Setter = (value: unknown) => Promise<unknown>;

type LocalForageOptions = {
  name?: string;
  storeName?: string;
};

/**
 * Usage example:
 *
 * const IS_DEV_KEY = 'is-dev';
 *
 * const { values: [isDev], setItem } = useLocalforage<[boolean]>([IS_DEV_KEY]);
 */
export function useLocalforage<T extends Array<unknown>>(
  keys: string[],
  options: LocalForageOptions = {}
) {
  const channelId = `localforage-${options.storeName ?? "gtd"}-${options.name ?? "default"}`;
  const [store, setStore] = useState<LocalForage | null>(null);
  const [values, setValues] = useState<T>([] as unknown as T);
  const [setters, setSetters] = useState<Setter[]>([] as Setter[]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (store) {
      const values = await Promise.all(keys.map((key) => store.getItem(key)));
      const setters = keys.map((key) => async (value: unknown) => {
        const result = await store.setItem(key, value);

        const channel = getChannel(channelId, "send");
        channel.postMessage({ key, value });

        return result;
      });

      setValues(values as T);
      setSetters(setters);

      return values;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join("/"), !!store]);

  const setItem = useCallback(
    async (key: string, value: unknown) => {
      if (store) {
        const result = await store.setItem(key, value);

        const channel = getChannel(channelId, "send");
        channel.postMessage({ key, value });

        return result;
      }
    },
    [channelId, store]
  );

  useEffect(() => {
    refresh().then(async () => {
      await wait(10);
      setIsLoaded(true);
    });
  }, [refresh]);

  useEffect(
    () => (!store && setStore(localforage.createInstance(options)), undefined),
    [options] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const channel = getChannel(channelId, "receive");

    function listener({ data }: { data: { key: string; value: unknown } }) {
      if (keys.includes(data.key)) {
        const { key, value } = data;

        setValues((values) => {
          const index = keys.indexOf(key);

          if (index > -1) {
            values[index] = value;
          }

          return structuredCloneWithFallback<T>(values);
        });
      }
    }

    channel.addEventListener("message", listener);

    return () => {
      channel.removeEventListener("message", listener);
    };
  }, [setValues, keys, channelId]);

  return { values, refresh, setters, setItem, store, isLoaded };
}

const CHANNELS = new Map<string, BroadcastChannel>();

function getChannel(channelId: string, sendOrReceive: "send" | "receive") {
  const id = `${channelId}-${sendOrReceive}`;

  if (!CHANNELS.has(id)) {
    CHANNELS.set(id, new BroadcastChannel(channelId));
  }

  return CHANNELS.get(id) as BroadcastChannel;
}

export function closeChannel(channelId: string, sendOrReceive: "send" | "receive") {
  const id = `${channelId}-${sendOrReceive}`;
  const channel = CHANNELS.get(id);

  if (channel) {
    CHANNELS.delete(id);
    channel.close();
  }
}
