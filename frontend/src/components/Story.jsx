import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const Story = ({ story }) => {
  const [isViewed, setIsViewed] = useState(false);

  const handleView = () => {
    setIsViewed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        width: '80px',
        height: '120px',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        border: isViewed ? '2px solid gray' : '2px solid blue',
      }}
      onClick={handleView}
    >
      {story.mediaType === 'image' && (
        <img src={story.media} alt="Story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {story.mediaType === 'video' && (
        <video src={story.media} style={{ width: '100%', height: '100%' }} muted autoPlay />
      )}
      {story.mediaType === 'audio' && (
        <Box
          sx={{
            bgcolor: 'gray.200',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography>Audio Story</Typography>
        </Box>
      )}
    </motion.div>
  );
};

export default Story;
