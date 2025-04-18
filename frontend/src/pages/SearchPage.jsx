import { useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { message } from "antd";
import Post from "../components/Post";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      message.error("Please enter a username to search");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/user/${searchQuery}`);
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        setSearchResults([]);
        return;
      }
      setSearchResults(data);
    } catch (error) {
      message.error(error.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Search Posts by User
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 4,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <TextField
            fullWidth
            placeholder="Enter username to search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {loading ? <CircularProgress size={24} /> : "Search"}
          </Button>
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {!loading && searchResults.length === 0 && searchQuery && (
          <Typography textAlign="center" my={4}>
            No posts found for "{searchQuery}"
          </Typography>
        )}

        {!loading && searchResults.length > 0 && (
          <Grid container spacing={3}>
            {searchResults.map((post) => (
              <Grid item xs={12} key={post._id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Post post={post} postedBy={post.postedBy} />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </motion.div>
  );
};

export default SearchPage;