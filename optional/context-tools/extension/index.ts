import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { registerContextTools } from './lib/adapter.mjs';

// Pi supplies TypeBox and extension types. No npm install or secrets in this plugin.
// The implementation uses the session's modelRegistry.streamSimple, not a separate
// raw HTTP client: configured providers/auth and custom provider registrations remain visible.
export default function contextTools(pi: ExtensionAPI) {
  const schema = Type.Object({
    question: Type.String({ minLength: 1, maxLength: 2048 }),
    files: Type.Array(Type.Object({
      path: Type.String({ minLength: 1, maxLength: 512 }),
      offset: Type.Optional(Type.Integer({ minimum: 1, maximum: 10000000 })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10000000 })),
    }, { additionalProperties: false }), { minItems: 1, maxItems: 16 }),
  }, { additionalProperties: false });
  registerContextTools(pi, schema);
}
