import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from 'react-dropzone';
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { TrashIcon, ArrowUpTrayIcon, FolderIcon, PlayIcon, PauseIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import itemsData from "./data/files.json";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={onClose}
    >
      <div className="bg-nightMid p-6 rounded-md shadow-lg text-white max-w-sm w-full">
        <p className="text-lg mb-4">{message}</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-nightLight rounded hover:bg-accent hover:text-night transition"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-night bg-accent rounded hover:bg-accentMid transition"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

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
      className="bg-nightLight hover:bg-accent hover:text-night p-2 rounded-full px-4 flex items-center gap-1"
    >
      
      {isPlaying 
        ? <PauseIcon className="w-5 h-5"/> 
        : <PlayIcon className="w-5 h-5"/>
      }

      <span className="text-nowrap">
        Default
      </span>
    </button>
  );
});

const TrackerScrubber = ({ currentTime, duration, onChange }) => {
  const handleScrubberClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left; // Click position relative to the element
    const newTime = (clickPosition / rect.width) * duration;
    onChange(newTime);
  };

  return (
    <div
      className="relative w-[120px] h-2 bg-gray-600 rounded cursor-pointer"
      onClick={handleScrubberClick}
    >
      <div
        className="absolute top-0 left-0 h-full bg-accent rounded"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />
      <div
        className="absolute top-0 left-0 h-2 w-4 bg-accentLight rounded-full transform -translate-x-1/2"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      />
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

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
    <div className="flex items-center gap-4 mt-2">
      <button
        onClick={togglePlayPause}
        className={`p-2 rounded ${
          isPlaying ? "bg-accent hover:bg-accentLight text-night" : "bg-nightLight hover:bg-night text-white"
        }`}
      >
        {isPlaying 
          ? <PauseIcon className="h-5 w-5" /> 
          : <PlayIcon className="h-5 w-5" />}
      </button>
      <div className="flex-1">
        <TrackerScrubber
          currentTime={currentTime}
          duration={duration}
          onChange={handleScrubberChange}
        />
        <div className="flex justify-between text-xs text-accentLight mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

const AudioTrack = React.memo(({ name, url, size, onRemove }) => (
  <div className="p-4 border-l-4 border-l-transparent mt-0 hover:border-l-accent">
    <b>{name}</b>

    <small className="table bg-night mt-2 mb-1 border-2 border-nightLight border-solid py-1 px-4 rounded-full">{formatFileSize(size)}</small>

    <div className="flex items-center justify-between">
      <AudioControls url={url} />
      <button
        onClick={() => onRemove(name)}
        className="bg-nightLight text-white p-2 rounded hover:bg-accent hover:text-night flex items-center gap-1"
      >
        <TrashIcon className="h-5 w-5" />
        <span className="hidden">Delete</span>
      </button>
    </div>
  </div>
));

const handleExportConfig = (config, packInfo) => {
  const exportMappings = {};
  for (const fileName in config) {
    exportMappings[fileName] = config[fileName].map((f) => f.name);
  }

  const configData = {
    ...packInfo,
    mappings: exportMappings,
  };

  const blob = new Blob([JSON.stringify(configData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "config.json";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
};


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
          size: file.size
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

const Dropzone = React.memo(({ fileName, handleFileUpload }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((acceptedFiles) => handleFileUpload(fileName, acceptedFiles), [fileName, handleFileUpload]),
    accept: {"audio/wav": [".wav"]}, // Only allow .wav files
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-dashed border-4 p-6 rounded-lg transition-colors ${
        isDragActive ? "border-accent" : "border-nightLight"
      } bg-nightMid text-white text-center cursor-pointer hover:bg-nightLight`}
    >
      <input {...getInputProps()} />
      <p>Add <b className="text-accent">.wav</b> File(s) <br/> or Drag & Drop</p>
    </div>
  );
});

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    setIsModalOpen(true);
  };

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

  const handleFileUploadCallback = useCallback(
    (fileName, acceptedFiles) =>
      handleFileUpload(fileName, acceptedFiles, config, setConfig, setErrorMessage),
    [config]
  );

  const handleRemoveAllFiles = (trackName) => {
    const newConfig = { ...config };
    newConfig[trackName] = [];
    setConfig(newConfig);
  }

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

  const confirmImport = (event) => {
    fileInputRef.current.click(); // Trigger the file input dialog programmatically
    setIsModalOpen(false);
  };

  const cancelImport = () => {
    setIsModalOpen(false);
  }

  const handlePackInfoChange = useCallback((field, value) => {
    setPackInfo((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-night text-white font-sans p-4 mx-auto block">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={cancelImport}
        onConfirm={confirmImport}
        message="Importing a new ZIP file will replace your current project. Are you sure you want to continue?"
      />

      <div className="md:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-left mb-6">SDeckTools</h1>
          <h2 className="text-xl font-bold text-left">Create SFX Packs</h2>
          <h3 className="text-sm border-l-accent border-l-4 pl-2">For SteamOS & Big Picture</h3>
        </div>

        <div className="md:mb-14 mt-8 md:mt-auto flex justify-center">
          <button
            type="button"
            className="bg-accent text-night p-3 rounded w-full md:w-auto hover:bg-accent/90 cursor-pointer flex items-center justify-center gap-2"
            onClick={handleUploadClick}
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Import <b className="bg-accentMid inline-block font-bold px-2 rounded-sm">zip</b>
          </button>
          <input
            id="zip-upload"
            ref = { fileInputRef }
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleZipUpload}
          />
        </div>
      </div>


      <div className="md:flex w-full mt-4 mx-auto items-start justify-center">
        {/* Pack Info Form */}
        <div className="mb-8 rounded-md md:w-[50%] md:max-w-md md:sticky top-16">
          <h3 className="text-xl font-semibold mb-4">Pack.json Settings</h3>

          <div className="mb-4 pl-2">
            <label htmlFor="pack-name" className="block text-sm font-semibold text-accent">Name</label>
            <input
              id = "pack-name"
              type="text"
              className="w-full px-0 py-2 bg-transparent text-white mt-1"
              value={packInfo.name}
              onChange={(e) => handlePackInfoChange("name", e.target.value)}
            />
          </div>

          <div className="mb-4 pl-2">
            <label htmlFor="pack-description" className="block text-sm font-semibold text-accent">Description</label>
            <textarea
              id="pack-description"
              className="w-full p-2 rounded bg-nightLight text-white mt-1"
              value={packInfo.description}
              onChange={(e) => handlePackInfoChange("description", e.target.value)}
            />
          </div>

          <div className="mb-4 pl-2">
            <label htmlFor="pack-author" className="block text-sm font-semibold text-accent">Author</label>
            <input
              id="pack-author"
              type="text"
              className="w-full px-0 py-2 bg-transparent text-white mt-1"
              value={packInfo.author}
              onChange={(e) => handlePackInfoChange("author", e.target.value)}
            />
          </div>

          <div className="mb-4 pl-2">
            <label htmlFor="pack-version" className="block text-sm font-semibold text-accent">Version</label>
            <input
              id="pack-version"
              type="text"
              className="w-full px-0 py-2 bg-transparent text-white mt-1"
              value={packInfo.version}
              onChange={(e) => handlePackInfoChange("version", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => handleExportConfig(config, packInfo)}
              className="bg-accent text-night p-3 rounded hover:bg-accent/90 cursor-pointer flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export <b className="bg-accentMid inline-block font-bold px-2 rounded-sm">pack.json</b>
            </button>
            <button
              onClick={handleExport}
              className="bg-accent text-night ml-2 p-3 rounded hover:bg-accent/90 cursor-pointer flex items-center gap-2"
            >
              <FolderIcon className="h-5 w-5" />
              Export <b className="bg-accentMid inline-block font-bold px-2 rounded-sm">zip</b>
            </button>
          </div>
        </div>

        <div className="md:ml-16 flex-1 md:max-w-xl">
          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 table text-white text-left text-sm border-l-red-600 border-l-4 bg-nightMid pb-2 pt-1 sticky top-0">{errorMessage}</div>
          )}

          <ul className="list-none block w-full">
            {itemsData.map((item) => (
              <li key={item.fileName} className="mb-12 w-full block">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-left">{item.title}</h2>
                    <small className="text-sm text-left mt-2 mb-2">{item.fileName}</small>
                  </div>
                  <PreviewButton fileName={item.fileName} />
                </div>
                <p className="text-left mt-2 mb-2">{item.description}</p>

                <div className="my-4">
                  <Dropzone 
                    fileName={item.fileName} 
                    handleFileUpload={handleFileUploadCallback}  
                  />
                </div>

                { (config[item.fileName].length > 0) &&
                  <small className="table mb-[-16px] py-1 px-6 rounded-t-md bg-nightMid">
                    { config[item.fileName].length } Files
                    <button
                      type="button"
                      onClick={() => handleRemoveAllFiles(item.fileName)}
                      className="bg-nightLight rounded inline-block ml-2 py-1 px-2"
                    >
                      <TrashIcon className="w-3 h-3" />
                      <span className="hidden">Remove all Files</span>
                    </button>
                  </small>
                }

                <div className="mt-4 max-h-[240px] overflow-y-auto bg-nightMid">
                  {config[item.fileName].map(({ name, url, size }) => (
                    <AudioTrack key={name} name={name} url={url} size={size} onRemove={(name) => handleRemoveFile(item.fileName, name)} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
