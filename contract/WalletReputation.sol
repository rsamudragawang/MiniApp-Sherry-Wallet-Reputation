// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PermanentLike
 * @dev A simple, on-chain endorsement system to create a permanent record of social capital.
 * This contract allows users to "like" or "endorse" a content creator, storing the
 * total number of likes for each creator immutably on the blockchain.
 */
contract PermanentLike {

    // --- State Variables ---

    /**
     * @dev A mapping from a content creator's address to the number of likes they have received.
     * The `public` keyword automatically creates a getter function, so anyone can query
     * the like count for a given address.
     * e.g., likeCounts(0x123...abc) will return the total likes for that address.
     */
    mapping(address => uint256) public likeCounts;

    /**
     * @dev A mapping to track which users have already liked a specific content creator.
     * This prevents a single user from liking the same creator multiple times.
     * The structure is mapping(contentCreatorAddress => mapping(likerAddress => boolean)).
     */
    mapping(address => mapping(address => bool)) private hasLiked;

    // --- Events ---

    /**
     * @dev Emitted when a user successfully likes a content creator.
     * This allows for off-chain applications to easily track and display like activity.
     * @param liker The address of the user who performed the like.
     * @param contentCreator The address of the content creator who was liked.
     */
    event Liked(address indexed liker, address indexed contentCreator);

    // --- Functions ---

    /**
     * @notice Allows a user to "like" or "endorse" a content creator.
     * @dev This is the single function for the contract. When called, it increments the
     * like counter for the specified `contentCreator` address. It includes a check
     * to ensure a user cannot like the same creator more than once.
     * @param contentCreator The Ethereum address of the person, project, or content being liked.
     */
    function like(address contentCreator) public {
        // Prevent users from liking themselves
        require(msg.sender != contentCreator, "PermanentLike: You cannot like yourself.");
        
        // Check if the sender has already liked this content creator
        require(!hasLiked[contentCreator][msg.sender], "PermanentLike: You have already liked this creator.");

        // Mark that the sender has now liked this content creator
        hasLiked[contentCreator][msg.sender] = true;
        
        // Increment the like count for the content creator
        likeCounts[contentCreator]++;

        // Emit an event to log the action on the blockchain
        emit Liked(msg.sender, contentCreator);
    }
}
