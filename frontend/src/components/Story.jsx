import { Box, Image, Text } from "@chakra-ui/react";
import { useState } from "react";

const Story = ({ story }) => {
	const [isViewed, setIsViewed] = useState(false);

	const handleView = () => {
		setIsViewed(true);
	};

	return (
		<Box
			w="80px"
			h="120px"
			borderRadius="md"
			overflow="hidden"
			position="relative"
			cursor="pointer"
			onClick={handleView}
			border={isViewed ? "2px solid gray" : "2px solid blue"}
		>
			{story.mediaType === "image" && <Image src={story.media} w="full" h="full" objectFit="cover" />}
			{story.mediaType === "video" && (
				<video src={story.media} style={{ width: "100%", height: "100%" }} muted autoPlay />
			)}
			{story.mediaType === "audio" && (
				<Box bg="gray.200" h="full" display="flex" alignItems="center" justifyContent="center">
					<Text>Audio Story</Text>
				</Box>
			)}
		</Box>
	);
};

export default Story;