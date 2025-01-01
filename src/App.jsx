import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from 'react-dropzone';
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { TrashIcon, ArrowUpTrayIcon, FolderIcon, PlayIcon, PauseIcon, EyeIcon } from "@heroicons/react/24/outline";
import itemsData from "./data/files.json";

const PreviewButton = React.memo(({ fileName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio(`/sounds/${fileName}`));

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  return (
    <button
      onClick={togglePlayPause}
      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-400 flex items-center gap-1"
    >
      <EyeIcon className="h-5 w-5" />
      {isPlaying ? "Pause Preview" : "Preview"}
    </button>
  );
});

const AudioControls = React.memo(({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio(url));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleScrubberChange = (e) => {
    const newTime = parseFloat(e.target.value);
    const audio = audioRef.current;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={togglePlayPause}
        className={`p-2 rounded-full text-white ${
          isPlaying ? "bg-red-500 hover:bg-red-400" : "bg-green-500 hover:bg-green-400"
        }`}
      >
        {isPlaying 
          ? <PauseIcon className="h-5 w-5" /> 
          : <PlayIcon className="h-5 w-5" />}
      </button>
      <div className="flex-1">
        <input
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={currentTime}
          onChange={handleScrubberChange}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

const AudioTrack = React.memo(({ name, url, onRemove }) => (
  <div className="flex items-center gap-4">
    <b>{name}</b>
    <AudioControls url={url} />
    <button
      onClick={() => onRemove(name)}
      className="bg-red-500 text-white p-2 rounded hover:bg-red-400 flex items-center gap-1"
    >
      <TrashIcon className="h-5 w-5" />
      <span className="hidden">Delete</span>
    </button>
  </div>
));

const Dropzone = React.memo(({ fileName, handleFileUpload }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((acceptedFiles) => handleFileUpload(fileName, acceptedFiles), [fileName, handleFileUpload]),
    accept: ".wav", // Only allow .wav files
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-dashed border-4 p-6 rounded-lg transition-colors ${
        isDragActive ? "border-blue-500" : "border-gray-400"
      } bg-gray-800 text-white text-center`}
    >
      <input {...getInputProps()} />
      <p>Drag & drop audio files here, or click to select files</p>
    </div>
  );
});

const handleFileUpload = (fileName, acceptedFiles, config, setConfig, setErrorMessage) => {
  const newConfig = { ...config };
  let invalidFiles = false;

  acceptedFiles.forEach((file) => {
    if (!file.name.endsWith(".wav")) {
      invalidFiles = true;
      return;
    }

    const fileExists = newConfig[fileName]?.find((f) => f.name === file.name);
    if (!fileExists) {
      const objectURL = URL.createObjectURL(file);
      newConfig[fileName] = [
        ...(newConfig[fileName] || []),
        {
          name: file.name,
          file,
          url: objectURL,
          size: file.size,
        },
      ];
    }
  });

  setConfig(newConfig);
  if (invalidFiles) {
    setErrorMessage("Some files were incompatible and have been skipped.");
  } else {
    setErrorMessage(""); // Clear error message if all files are valid
  }
};

const App = () => {
  const [config, setConfig] = useState(
    itemsData.reduce((acc, item) => {
      acc[item.fileName] = [];
      return acc;
    }, {})
  );

  const [packInfo, setPackInfo] = useState({
    name: "SDeckTools Pack",
    description: "SFX Pack created in SDeckTools.com",
    author: "SDeckTools.com",
    version: "v1.0",
    manifest_version: 2,
    music: false,
    ignore: [],
    mappings: { ...config },
  });

  const [errorMessage, setErrorMessage] = useState("");

  const handleRemoveFile = (fileName, trackName) => {
    const newConfig = { ...config };
    newConfig[fileName] = newConfig[fileName].filter((track) => {
      URL.revokeObjectURL(track.url);
      return track.name !== trackName;
    });
    setConfig(newConfig);
  };

  const handleExport = async () => {
    const zip = new JSZip();

    // Generate updated pack.json with packInfo and current mappings
    const exportMappings = {};
    for (const fileName in config) {
      exportMappings[fileName] = config[fileName].map((f) => f.name);
    }

    const updatedPackJson = {
      ...packInfo,
      mappings: exportMappings,
    };
    zip.file("pack.json", JSON.stringify(updatedPackJson, null, 2));

    // Add all uploaded files to the ZIP
    for (const fileName in config) {
      for (const { name, file } of config[fileName]) {
        zip.file(name, file);
      }
    }

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "audio_pack.zip");
    });
  };

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // Parse pack.json
    const packJsonFile = loadedZip.file("pack.json");
    if (!packJsonFile) {
      alert("Invalid ZIP file: pack.json not found.");
      return;
    }

    const packJsonContent = await packJsonFile.async("text");
    const parsedPack = JSON.parse(packJsonContent);

    const newConfig = {};
    const objectURLs = [];

    // Update config with tracks from ZIP
    for (const fileName in parsedPack.mappings) {
      const tracks = parsedPack.mappings[fileName];
      newConfig[fileName] = [];

      for (const trackName of tracks) {
        const trackFile = loadedZip.file(trackName);
        if (!trackFile) continue;

        const blob = await trackFile.async("blob");
        const objectURL = URL.createObjectURL(blob);

        objectURLs.push(objectURL); // Keep track of objectURLs for cleanup
        newConfig[fileName].push({
          name: trackName,
          file: blob,
          url: objectURL,
          size: blob.size,
        });
      }
    }

    // Revoke existing URLs in the current project
    Object.values(config).flat().forEach((track) => URL.revokeObjectURL(track.url));

    // Update state
    setConfig(newConfig);
    setPackInfo(parsedPack);
  };

  const handlePackInfoChange = useCallback((field, value) => {
    setPackInfo((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-night text-white font-sans p-4 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6 text-center">Audio Pack Builder</h1>

      <div className="mb-8 flex justify-center">
        <label
          htmlFor="zip-upload"
          className="bg-accent text-white p-3 rounded hover:bg-accent/90 cursor-pointer flex items-center gap-2"
        >
          <ArrowUpTrayIcon className="h-5 w-5" />
          Upload ZIP
        </label>
        <input
          id="zip-upload"
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleZipUpload}
        />
        <button
          onClick={handleExport}
          className="bg-accent text-white ml-2 p-3 rounded hover:bg-accent/90 cursor-pointer flex items-center gap-2"
        >
          <FolderIcon className="h-5 w-5" />
          Export as ZIP
        </button>
      </div>

      {/* Pack Info Form */}
      <div className="mb-8 p-4 bg-gray-800 rounded-md w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Pack Info</h3>

        <div className="mb-4">
          <label className="block text-sm font-semibold">Name</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-gray-700 text-white mt-1"
            value={packInfo.name}
            onChange={(e) => handlePackInfoChange("name", e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold">Description</label>
          <textarea
            className="w-full p-2 rounded bg-gray-700 text-white mt-1"
            value={packInfo.description}
            onChange={(e) => handlePackInfoChange("description", e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold">Author</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-gray-700 text-white mt-1"
            value={packInfo.author}
            onChange={(e) => handlePackInfoChange("author", e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold">Version</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-gray-700 text-white mt-1"
            value={packInfo.version}
            onChange={(e) => handlePackInfoChange("version", e.target.value)}
          />
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 text-red-500 text-center">{errorMessage}</div>
      )}

      {/* Dropzone for each item */}
      {itemsData.map((item) => (
        <div key={item.fileName} className="mb-8 w-full max-w-md">
          <h2 className="text-xl font-semibold text-center">{item.title}</h2>
          <p className="text-gray-400 text-center mb-2">{item.description}</p>
          <p className="text-sm text-gray-500 text-center mb-2">{item.fileName}</p>
          <PreviewButton fileName={item.fileName} />

          <div className="my-4">
            {/* Custom Dropzone for file upload */}
            <Dropzone fileName={item.fileName} />
          </div>

          <div className="mt-4 space-y-4">
            {config[item.fileName].map(({ name, url }) => (
              <AudioTrack key={name} name={name} url={url} onRemove={(name) => handleRemoveFile(item.fileName, name)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;
