import { useState } from "react";
import useShowToast from "./useShowToast";

const usePreviewImg = () => {
	const [mediaUrl, setMediaUrl] = useState(null);
	const [mediaType, setMediaType] = useState(null);
	const showToast = useShowToast();

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
		const validVideoTypes = ["video/mp4", "video/webm"];
		const validAudioTypes = ["audio/mpeg", "audio/wav"];
		const validDocTypes = ["application/pdf", "text/plain"];

		const reader = new FileReader();

		if (validImageTypes.includes(file.type)) {
			reader.onloadend = () => {
				setMediaUrl(reader.result);
				setMediaType("image");
			};
			reader.readAsDataURL(file);
		} else if (validVideoTypes.includes(file.type)) {
			if (file.size > 16 * 1024 * 1024) {
				showToast("File too large", "Video must be less than 16MB", "error");
				return;
			}
			reader.onloadend = () => {
				setMediaUrl(reader.result);
				setMediaType("video");
			};
			reader.readAsDataURL(file);
		} else if (validAudioTypes.includes(file.type)) {
			if (file.size > 16 * 1024 * 1024) {
				showToast("File too large", "Audio must be less than 16MB", "error");
				return;
			}
			reader.onloadend = () => {
				setMediaUrl(reader.result);
				setMediaType("audio");
			};
			reader.readAsDataURL(file);
		} else if (validDocTypes.includes(file.type)) {
			if (file.size > 2 * 1024 * 1024 * 1024) {
				showToast("File too large", "Document must be less than 2GB", "error");
				return;
			}
			reader.onloadend = () => {
				setMediaUrl(reader.result);
				setMediaType("document");
			};
			reader.readAsDataURL(file);
		} else {
			showToast("Invalid file type", "Please select a valid image, video, audio, or document file", "error");
			setMediaUrl(null);
			setMediaType(null);
		}
	};

	return { handleImageChange, mediaUrl, setMediaUrl, mediaType, setMediaType };
};

export default usePreviewImg;