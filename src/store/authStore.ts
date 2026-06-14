// src/store/authStore.ts
import { create } from "zustand";

const SESSION_KEY =
  "finance-planner-session";

const SESSION_DURATION =
  60 * 60 * 1000;

interface AuthStore {
  authenticated: boolean;

  login: (
    password: string
  ) => boolean;

  logout: () => void;

  restore: () => void;
}

export const useAuthStore =
  create<AuthStore>(
    (set) => ({
      authenticated:
        false,

      login: (
        password
      ) => {
        const expected =
          import.meta.env
            .VITE_APP_PASSWORD;

        if (
          password !==
          expected
        ) {
          return false;
        }

        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            expiresAt:
              Date.now() +
              SESSION_DURATION,
          })
        );

        set({
          authenticated:
            true,
        });

        return true;
      },

      logout: () => {
        localStorage.removeItem(
          SESSION_KEY
        );

        set({
          authenticated:
            false,
        });
      },

      restore: () => {
        const raw =
          localStorage.getItem(
            SESSION_KEY
          );

        if (!raw) {
          set({
            authenticated:
              false,
          });

          return;
        }

        try {
          const session =
            JSON.parse(raw);

          if (
            Date.now() >=
            session.expiresAt
          ) {
            localStorage.removeItem(
              SESSION_KEY );

            set({
              authenticated:
                false,
            });

            return;
          }

          set({
            authenticated:
              true,
          });
        } catch {
          localStorage.removeItem(
            SESSION_KEY
          );

          set({
            authenticated:
              false,
          });
        }
      },
    })
  );