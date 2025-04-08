import { Box, Text, Input, Button, VStack, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import useShowToast from "../hooks/useShowToast";
import Post from "../components/Post"; // Reuse your Post component

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const showToast = useShowToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showToast("Error", "Please enter a username to search", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/user/${searchQuery}`);
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        setSearchResults([]);
        return;
      }
      setSearchResults(data); // Array of posts
    } catch (error) {
      showToast("Error", error.message, "error");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Search Posts by User
      </Text>
      <VStack spacing={4} align="stretch">
        <Box>
          <Input
            placeholder="Enter username to search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button mt={2} colorScheme="blue" onClick={handleSearch} isLoading={loading}>
            Search
          </Button>
        </Box>

        {loading && (
          <Spinner size="lg" alignSelf="center" />
        )}

        {!loading && searchResults.length === 0 && searchQuery && (
          <Text>No posts found for "{searchQuery}"</Text>
        )}

        {!loading && searchResults.length > 0 && (
          <VStack spacing={4}>
            {searchResults.map((post) => (
              <Post key={post._id} post={post} postedBy={post.postedBy} />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default SearchPage;