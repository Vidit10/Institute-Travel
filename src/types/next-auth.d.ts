import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      onboarded?: boolean;
      gender?: string;
      isAdmin?: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
