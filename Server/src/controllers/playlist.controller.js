import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  checkId,
  readText,
  readPagination,
  getOwnedDocument,
} from "../utils/validation.js";

const publicFields = "username fullName avatar";

const playlistPopulate = (viewerId) => [
  {
    path: "owner",
    select: publicFields,
  },
  {
    path: "videos",
    match: {
      $or: [{ isPublished: true }, { owner: viewerId }],
    },
    select: "title description thumbnail videoFile duration views owner createdAt",
    populate: {
      path: "owner",
      select: publicFields,
    },
  },
];

const createPlaylist = asyncHandler(async (req, res) => {
  const name = readText(req.body?.name, "Name", 100);
  const description = readText(
    req.body?.description,
    "Description",
    1000
  );

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
    videos: [],
  });

  await playlist.populate(playlistPopulate(req.user._id));

  return res.status(201).json(
    new ApiResponse(201, playlist, "Playlist created successfully")
  );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  checkId(userId);

  const { page, limit } = readPagination(req.query);

  if (!(await User.exists({ _id: userId }))) {
    throw new ApiError(404, "User not found");
  }

  const filter = { owner: userId };

  const [playlists, totalPlaylists] = await Promise.all([
    Playlist.find(filter)
      .select("-videos")
      .populate("owner", publicFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Playlist.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        playlists,
        page,
        limit,
        totalPlaylists,
        totalPages: Math.ceil(totalPlaylists / limit),
      },
      "Playlists fetched successfully"
    )
  );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  checkId(req.params.playlistId);

  const playlist = await Playlist.findById(req.params.playlistId)
    .populate(playlistPopulate(req.user._id));

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res.status(200).json(
    new ApiResponse(200, playlist, "Playlist fetched successfully")
  );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  checkId(videoId);

  await getOwnedDocument(
    Playlist,
    playlistId,
    req.user._id,
    "playlist"
  );

  const video = await Video.exists({
    _id: videoId,
    $or: [{ isPublished: true }, { owner: req.user._id }],
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Allow up to 200 videos; adding an existing video is harmless.
  const playlist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user._id,
      $or: [
        { videos: videoId },
        { $expr: { $lt: [{ $size: "$videos" }, 200] } },
      ],
    },
    { $addToSet: { videos: videoId } },
    { new: true, runValidators: true }
  ).populate(playlistPopulate(req.user._id));

  if (!playlist) {
    throw new ApiError(
      409,
      "Playlist is full or no longer available. Refresh and retry"
    );
  }

  return res.status(200).json(
    new ApiResponse(200, playlist, "Video added to playlist")
  );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  checkId(videoId);

  await getOwnedDocument(
    Playlist,
    playlistId,
    req.user._id,
    "playlist"
  );

  const playlist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    { $pull: { videos: videoId } },
    { new: true }
  ).populate(playlistPopulate(req.user._id));

  if (!playlist) {
    throw new ApiError(404, "Playlist no longer exists");
  }

  return res.status(200).json(
    new ApiResponse(200, playlist, "Video removed from playlist")
  );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  await getOwnedDocument(
    Playlist,
    playlistId,
    req.user._id,
    "playlist"
  );

  const updates = {};

  if (req.body?.name !== undefined) {
    updates.name = readText(req.body.name, "Name", 100);
  }

  if (req.body?.description !== undefined) {
    updates.description = readText(
      req.body.description,
      "Description",
      1000
    );
  }

  if (!Object.keys(updates).length) {
    throw new ApiError(400, "Provide name or description");
  }

  const playlist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate(playlistPopulate(req.user._id));

  if (!playlist) {
    throw new ApiError(404, "Playlist no longer exists");
  }

  return res.status(200).json(
    new ApiResponse(200, playlist, "Playlist updated successfully")
  );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  await getOwnedDocument(
    Playlist,
    playlistId,
    req.user._id,
    "playlist"
  );

  const playlist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist no longer exists");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { playlistId },
      "Playlist deleted successfully"
    )
  );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};