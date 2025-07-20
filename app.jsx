import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { WebsimSocket, useQuery } from "@websim/use-query";
import QRCode from "qrcode";
const room = new WebsimSocket();
const COLLECTION_TYPE = "visitor_qr_v1";
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
function QRCodeCard({ visitor, commentCount }) {
  const canvasRef = useRef(null);
  const profileUrl = `https://websim.com/@${visitor.username}`;
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState("");
  useEffect(() => {
    if (canvasRef.current && visitor.username) {
      QRCode.toCanvas(canvasRef.current, profileUrl, { width: 180, margin: 1, errorCorrectionLevel: "H" }, function(error) {
        if (error) console.error(error);
      });
    }
  }, [visitor.username, profileUrl]);
  const handlePostToComments = async () => {
    if (!canvasRef.current || isPosting) return;
    setIsPosting(true);
    setPostStatus("Posting...");
    try {
      const blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, "image/png"));
      const file = new File([blob], `qr_code_${visitor.username}.png`, { type: "image/png" });
      const imageUrl = await window.websim.upload(file);
      const commentContent = `Check out the QR code for @${visitor.username}!`;
      const result = await window.websim.postComment({
        content: commentContent,
        images: [imageUrl]
      });
      if (result && result.error) {
        throw new Error(`Failed to post comment: ${result.error}`);
      }
      setPostStatus("Posted!");
    } catch (error) {
      console.error("Failed to post QR code to comments:", error);
      setPostStatus("Failed!");
    } finally {
      setTimeout(() => {
        setIsPosting(false);
        setPostStatus("");
      }, 2e3);
    }
  };
  const getButtonContent = () => {
    if (isPosting) return "\u23F3";
    if (postStatus === "Posted!") return "\u2705";
    if (postStatus === "Failed!") return "\u274C";
    return "\u{1F4E4}";
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "qr-card", children: [
    /* @__PURE__ */ jsxDEV("img", { src: `https://images.websim.com/avatar/${visitor.username}`, alt: `${visitor.username}'s avatar`, className: "user-avatar" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 76,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("button", { onClick: handlePostToComments, disabled: isPosting, className: "comment-button", title: "Post to comments", children: getButtonContent() }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 77,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "user-info", children: /* @__PURE__ */ jsxDEV("a", { href: profileUrl, target: "_blank", rel: "noopener noreferrer", className: "username-link", children: /* @__PURE__ */ jsxDEV("span", { className: "username", children: [
      "@",
      visitor.username
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 82,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 81,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 80,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("a", { href: profileUrl, target: "_blank", rel: "noopener noreferrer", className: "qr-link", children: /* @__PURE__ */ jsxDEV("canvas", { ref: canvasRef, width: "180", height: "180", className: "qr-code-canvas" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 86,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 85,
      columnNumber: 13
    }, this),
    commentCount > 0 && /* @__PURE__ */ jsxDEV("div", { className: "comment-count", children: commentCount }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 89,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 75,
    columnNumber: 9
  }, this);
}
function App() {
  const { data: visitors, loading } = useQuery(room.collection(COLLECTION_TYPE));
  const [sortedVisitors, setSortedVisitors] = useState([]);
  const [sortOrder, setSortOrder] = useState("random");
  const headerCanvasRef = useRef(null);
  const [commentCounts, setCommentCounts] = useState({});
  const processSingleComment = (comment, currentCounts) => {
    const qrCommentRegex = /Check out the QR code for @(\w+)!/;
    const hasImage = comment.content && comment.content.content.some((node) => node.type === "paragraph" && node.content && node.content.some((innerNode) => innerNode.type === "image"));
    if (comment.raw_content && hasImage) {
      const match = comment.raw_content.match(qrCommentRegex);
      if (match && match[1]) {
        const username = match[1];
        const newCounts = { ...currentCounts };
        newCounts[username] = (newCounts[username] || 0) + 1;
        return newCounts;
      }
    }
    return currentCounts;
  };
  useEffect(() => {
    const processComments = async () => {
      const project = await window.websim.getCurrentProject();
      if (!project) return;
      let allComments = [];
      let hasNextPage = true;
      let after = null;
      try {
        while (hasNextPage) {
          const params = new URLSearchParams({ first: "100" });
          if (after) params.append("after", after);
          const response = await fetch(`/api/v1/projects/${project.id}/comments?${params}`);
          if (!response.ok) throw new Error("Failed to fetch comments");
          const data = await response.json();
          const commentsData = data.comments.data;
          allComments = allComments.concat(commentsData.map((c) => c.comment));
          hasNextPage = data.comments.meta.has_next_page;
          after = data.comments.meta.end_cursor;
        }
        let counts = {};
        allComments.forEach((comment) => {
          counts = processSingleComment(comment, counts);
        });
        setCommentCounts(counts);
      } catch (error) {
        console.error("Error processing comments:", error);
      }
    };
    processComments();
    const handleNewComment = ({ comment }) => {
      setCommentCounts((prevCounts) => processSingleComment(comment, prevCounts));
    };
    window.websim.addEventListener("comment:created", handleNewComment);
    return () => {
      window.websim.removeEventListener("comment:created", handleNewComment);
    };
  }, []);
  useEffect(() => {
    if (headerCanvasRef.current) {
      const url = "https://websim.com/@api/qrc-wall";
      QRCode.toCanvas(headerCanvasRef.current, url, {
        width: 150,
        margin: 1,
        color: { dark: "#e0e0e0", light: "#121212" }
      }, function(error) {
        if (error) console.error(error);
      });
    }
  }, []);
  useEffect(() => {
    if (visitors) {
      let visitorsToSort = [...visitors];
      switch (sortOrder) {
        case "newest":
          visitorsToSort.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case "oldest":
          visitorsToSort.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case "alpha":
          visitorsToSort.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
          break;
        case "reverse-alpha":
          visitorsToSort.sort((a, b) => (b.username || "").localeCompare(a.username || ""));
          break;
        case "random":
        default:
          visitorsToSort = shuffleArray(visitorsToSort);
          break;
      }
      setSortedVisitors(visitorsToSort);
    }
  }, [visitors, sortOrder]);
  useEffect(() => {
    const checkInUser = async () => {
      const currentUser = await window.websim.getCurrentUser();
      if (!currentUser) return;
      try {
        await room.collection(COLLECTION_TYPE).upsert({
          id: currentUser.id,
          username: currentUser.username
        });
      } catch (error) {
        console.error("Failed to check in user:", error);
      }
    };
    checkInUser();
  }, []);
  const sortOptions = [
    { key: "random", label: "Random" },
    { key: "newest", label: "Newest" },
    { key: "oldest", label: "Oldest" },
    { key: "alpha", label: "A-Z" },
    { key: "reverse-alpha", label: "Z-A" }
  ];
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("a", { href: "https://websim.com/@api/qrc-wall", target: "_blank", rel: "noopener noreferrer", children: /* @__PURE__ */ jsxDEV("canvas", { ref: headerCanvasRef, id: "header-qr-code" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 233,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 232,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "filter-controls", children: sortOptions.map((option) => /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: () => setSortOrder(option.key),
        className: `filter-button ${sortOrder === option.key ? "active" : ""}`,
        children: option.label
      },
      option.key,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 237,
        columnNumber: 21
      },
      this
    )) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 235,
      columnNumber: 13
    }, this),
    loading && /* @__PURE__ */ jsxDEV("p", { children: "Loading visitors..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 246,
      columnNumber: 25
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "qr-grid", children: sortedVisitors.map((visitor) => /* @__PURE__ */ jsxDEV(QRCodeCard, { visitor, commentCount: commentCounts[visitor.username] || 0 }, visitor.id, false, {
      fileName: "<stdin>",
      lineNumber: 249,
      columnNumber: 21
    }, this)) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 247,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 231,
    columnNumber: 9
  }, this);
}
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 257,
  columnNumber: 13
}));
