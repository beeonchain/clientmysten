import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useWallet } from "@suiet/wallet-kit";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { BACKEND_URL } from "../config";
import useStore from "../store";

function AgentPage() {
  const { account, connected } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    twitter: "",
    website: "",
    description: "",
    profilePicture: null
  });
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      setFormData({ ...formData, profilePicture: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const creator_wallet = account.address;
    
    if (!formData.name || !formData.twitter || !formData.description || !creator_wallet) {
      toast.error("Please fill in all required fields (Name, Twitter, Description) and connect your wallet");
      return;
    }

    setLoading(true);
    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('twitter', formData.twitter);
    submitData.append('website', formData.website);
    submitData.append('description', formData.description);
    submitData.append('creator_wallet', creator_wallet);
    if (formData.profilePicture) {
      submitData.append('profilePicture', formData.profilePicture);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/proposals`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      if (response.status === 201) {
        toast.success("Proposal submitted successfully!");
        // Clear form
        setFormData({
          name: "",
          twitter: "",
          website: "",
          description: "",
          profilePicture: null
        });
        setPreviewUrl(null);
        // Navigate to home page
        navigate('/');
      }
    } catch (error) {
      console.error('Submission error:', error);
      // Don't show error toast if we got a successful response
      if (!error.response || error.response.status !== 201) {
        toast.error(error.response?.data?.error || "Failed to submit proposal");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!account.address) {
      navigate("/");
    }
  }, [account.address]);

  return (
    <Layout>
      <div className="container my-10">
        <form onSubmit={handleSubmit} className="w-[90%] mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-6">Agent Details:</h2>
            <div className="flex gap-10 items-end mb-6">
              <div className="mb-6 min-w-[150px]">
                <p className="mb-2 w-full">Profile Picture:</p>
                <label className="w-24 h-24 bg-white rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Profile preview" />
                  ) : (
                    <img src="/icon/upload.png" className="w-8 h-8 text-gray-400" alt="Upload icon" />
                  )}
                </label>
              </div>
              <div className="w-full">
                <label className="block mb-1">AI Agent Name:</label>
                <input
                  required
                  type="text"
                  placeholder="Enter AI Agent Name Here"
                  className="w-full px-3 py-2 bg-[#191919] border border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Twitter Handle</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter Twitter URL"
                    className="w-full px-3 py-2 bg-[#191919] border border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-1">Website (optional)</label>
                  <input
                    type="text"
                    placeholder="Enter Website URL"
                    className="w-full px-3 py-2 bg-[#191919] border border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">AI Agent Description</label>
                <textarea
                  required
                  rows={6}
                  className="w-full px-3 py-2 bg-[#191919] border border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-white py-3 rounded-md hover:bg-pink-700 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-600 focus:ring-offset-2 focus:ring-offset-black">
            Submit Proposal
          </button>
        </form>
      </div>
    </Layout>
  );
}

export default AgentPage;
