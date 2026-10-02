import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware Link, usePathname, useRouter and redirect for the public site. */
export const { Link, usePathname, useRouter, redirect } = createNavigation(routing);
