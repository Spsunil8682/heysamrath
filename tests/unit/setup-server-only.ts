// `server-only` throws when imported outside a React Server environment; neutralise it for unit tests.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
