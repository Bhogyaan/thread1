import { Avatar, Divider, Flex, Text, Button } from "@chakra-ui/react";
import { useState } from "react";
import useShowToast from "../hooks/useShowToast";
import { useRecoilValue, useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";

const Comment = ({ comment, lastComment, postId, onReply }) => {
  const user = useRecoilValue(userAtom);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const [liked, setLiked] = useState(comment.likes.includes(user?._id));
  const showToast = useShowToast();

  const handleLikeComment = async () => {
    if (!user) {
      showToast("Error", "You must be logged in to like a comment", "error");
      return;
    }

    try {
      const res = await fetch(`/api/posts/post/${postId}/comment/${comment._id}/like`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p._id === postId
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c._id === comment._id
                    ? {
                        ...c,
                        likes: liked
                          ? c.likes.filter((id) => id !== user._id)
                          : [...c.likes, user._id],
                      }
                    : c
                ),
              }
            : p
        ),
      }));
      setLiked(!liked);
      showToast("Success", `Comment ${liked ? "unliked" : "liked"} successfully`, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  return (
    <>
      <Flex gap={4} py={2} my={2} w={"full"}>
        <Avatar src={comment.userProfilePic} size={"sm"} />
        <Flex gap={1} w={"full"} flexDirection={"column"}>
          <Flex w={"full"} justifyContent={"space-between"} alignItems={"center"}>
            <Text fontSize="sm" fontWeight="bold">
              {comment.username}
            </Text>
            <Text fontSize="xs" color="gray.light">
              {comment.likes.length} likes
            </Text>
          </Flex>
          <Text>{comment.text}</Text>
          <Flex gap={2}>
            <Button size="xs" onClick={handleLikeComment}>
              {liked ? "Unlike" : "Like"}
            </Button>
            <Button size="xs" onClick={() => onReply(comment._id)}>
              Reply
            </Button>
          </Flex>
          {(comment.replies || []).map((reply, idx) => (
            <Flex key={idx} gap={2} pl={6}>
              <Avatar src={reply.userProfilePic} size="xs" />
              <Text fontSize="sm">
                <Text as="span" fontWeight="bold">
                  {reply.username}:{" "}
                </Text>
                {reply.text}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Flex>
      {!lastComment ? <Divider /> : null}
    </>
  );
};

export default Comment;