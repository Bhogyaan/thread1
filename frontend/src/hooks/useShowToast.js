// hooks/useShowToast.js
import { useSnackbar } from "notistack";
import { useCallback } from "react";

const useShowToast = () => {
  const { enqueueSnackbar } = useSnackbar();

  const showToast = useCallback(
    (message, description = "", variant = "default") => {
      enqueueSnackbar(`${message}${description ? ` - ${description}` : ""}`, {
        variant, // 'success' | 'error' | 'warning' | 'info' | 'default'
      });
    },
    [enqueueSnackbar]
  );

  return showToast;
};

export default useShowToast;
