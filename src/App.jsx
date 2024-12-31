import React, { useState, useEffect } from "react";
import { useDropzone } from 'react-dropzone';
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { TrashIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import itemsData from "./data/files.json";

// AudioTrack Component to display audio and manage loading
const AudioTrack = ({ name, url, onRemove }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const audio = new Audio(url);
    audio.oncanplaythrough = () => setLoading(false);
    audio.load();
  }, [url]);

  return (
    <div className="flex items-center gap-4">
      {loading ? (
        <div className="w-5 h-5 border-4 border-t-4 border-accent rounded-full animate-spin"></div> // Spinner
      ) : (
        <audio controls className="flex-1">
          <source src={url} />
          Your browser does not support the audio element.
        </audio>
      )}
      <button
        onClick={() => onRemove(name)}
        className="bg-red-500 text-white p-2 rounded hover:bg-red-400 flex items-center gap-1"
      >
        <TrashIcon className="h-5 w-5" />
        Remove
      </button>
    </div>
  );
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
  const [isDarkMode, setIsDarkMode] = useState(true); // State to toggle dark mode

  // File upload logic
  const handleFileUpload = (fileName, acceptedFiles) => {
    const newConfig = { ...config };
    let invalidFiles = false;

    acceptedFiles.forEach((file) => {
      if (!file.name.endsWith(".mp3") && !file.name.endsWith(".wav")) {
        invalidFiles = true;
        return;
      }

      const fileExists = newConfig[fileName].find((f) => f.name === file.name);
      if (!fileExists) {
        const objectURL = URL.createObjectURL(file);
        newConfig[fileName].push({
          name: file.name,
          file,
          url: objectURL,
          size: file.size,
        });
      }
    });

    setConfig(newConfig);
    if (invalidFiles) {
      setErrorMessage("Some files were incompatible and have been skipped.");
    } else {
      setErrorMessage(""); // Clear error message if all files are valid
    }
  };

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

  const handlePackInfoChange = (field, value) => {
    setPackInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Dropzone configuration for each track
  const Dropzone = ({ fileName }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles) => handleFileUpload(fileName, acceptedFiles),
      accept: ".mp3, .wav", // Only allow .mp3 and .wav files
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
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-night' : 'bg-white'} text-white font-sans p-4`}>
      <h1 className="text-3xl font-bold mb-6 text-center">Audio Pack Builder</h1>

      {/* Toggle for dark mode */}
      <button
        onClick={toggleDarkMode}
        className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-400 mb-4"
      >
        Toggle {isDarkMode ? "Light" : "Dark"} Mode
      </button>

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
      </div>

      {/* Pack Info Form */}
      <div className="mb-8 p-4 bg-gray-800 rounded-md">
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
        <div className="mb-4 text-red-500">{errorMessage}</div>
      )}

      {/* Dropzone for each item */}
      {itemsData.map((item) => (
        <div key={item.fileName} className="mb-8">
          <h2 className="text-xl font-semibold">{item.title}</h2>
          <p className="text-gray-400">{item.description}</p>
          <p className="text-sm text-gray-500">{item.fileName}</p>

          {/* Custom Dropzone for file upload */}
          <Dropzone fileName={item.fileName} />

          <div className="mt-4 space-y-4">
            {config[item.fileName].map(({ name, url }) => (
              <AudioTrack key={name} name={name} url={url} onRemove={(name) => handleRemoveFile(item.fileName, name)} />
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleExport}
        className="bg-accent text-white p-3 rounded hover:bg-accent/90 mt-6 block mx-auto"
      >
        Export as ZIP
      </button>
    </div>
  );
};

export default App;
