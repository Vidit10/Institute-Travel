import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      onboarded?: boolean;
      gender?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
