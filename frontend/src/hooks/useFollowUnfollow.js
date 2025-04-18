import { useState, useCallback } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";

const useFollowUnfollow = (user) => {
  const [following, setFollowing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const currentUser = useRecoilValue(userAtom);
  const showToast = useShowToast();

  const checkFollowing = useCallback(() => {
    if (!currentUser || !user?._id) {
      console.warn("User ID is missing in useFollowUnfollow");
      return false;
    }
    return currentUser.following?.includes(user._id) || false;
  }, [currentUser, user?._id]);

  useState(() => {
    setFollowing(checkFollowing());
  }, [checkFollowing]);

  const handleFollowUnfollow = async () => {
    if (!currentUser?._id || !user?._id) {
      showToast("Error", "User ID is missing", "error");
      console.error("User ID is missing in useFollowUnfollow");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      if (data.following) {
        showToast("Success", `You are now following ${user.username}`, "success");
        setFollowing(true);
        // Update currentUser state in Recoil
        currentUser.following = [...currentUser.following, user._id];
      } else {
        showToast("Success", `You have unfollowed ${user.username}`, "success");
        setFollowing(false);
        // Update currentUser state in Recoil
        currentUser.following = currentUser.following.filter((id) => id !== user._id);
      }
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  return { handleFollowUnfollow, updating, following };
};

export default useFollowUnfollow;