import {
  useEnhancedEffect_default
} from "./chunk-CEJZGZDB.js";
import {
  require_react
} from "./chunk-OC5S6P4L.js";
import {
  __toESM
} from "./chunk-SNAQBZPT.js";

// node_modules/@mui/utils/esm/useEventCallback/useEventCallback.js
var React = __toESM(require_react(), 1);
function useEventCallback(fn) {
  const ref = React.useRef(fn);
  useEnhancedEffect_default(() => {
    ref.current = fn;
  });
  return React.useRef((...args) => (
    // @ts-expect-error hide `this`
    (0, ref.current)(...args)
  )).current;
}
var useEventCallback_default = useEventCallback;

export {
  useEventCallback_default
};
//# sourceMappingURL=chunk-5GLCQS26.js.map
