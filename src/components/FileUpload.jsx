import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
        setStatus('Please select a file first!');
        return;
    }

    const formData = new FormData();
    formData.append('myFile', file); // 'myFile' matches the backend upload.single('myFile')

    setStatus('Uploading to Cloud...');

    try {
      // Requirement 5: Request is sent to backend service
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatus('✅ Success! File stored in S3 & Metadata in RDS.');
      setFileUrl(response.data.url);
    } catch (error) {
      console.error(error);
      setStatus('❌ Upload failed. Check Backend console.');
    }
  };

  return (
    <div style={{ border: '2px dashed #ccc', padding: '20px', borderRadius: '10px', maxWidth: '400px', margin: '0 auto' }}>
      <input type="file" onChange={handleFileChange} />
      <br /><br />
      <button
        onClick={handleUpload}
        style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        Upload to AWS
      </button>
      <p>{status}</p>
      {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer">View Uploaded File</a>}
    </div>
  );
};

export default FileUpload;