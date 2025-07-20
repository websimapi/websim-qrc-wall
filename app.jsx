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
function QRCodeCard({ visitor }) {
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
    /* @__PURE__ */ jsxDEV("a", { href: profileUrl, target: "_blank", rel: "noopener noreferrer", className: "qr-link", children: [
      /* @__PURE__ */ jsxDEV("canvas", { ref: canvasRef, width: "180", height: "180", className: "qr-code-canvas" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 81,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "user-info", children: /* @__PURE__ */ jsxDEV("span", { className: "username", children: [
        "@",
        visitor.username
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 83,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 82,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 80,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 75,
    columnNumber: 9
  }, this);
}
function App() {
  const { data: visitors, loading } = useQuery(room.collection(COLLECTION_TYPE));
  const [shuffledVisitors, setShuffledVisitors] = useState([]);
  useEffect(() => {
    if (visitors) {
      setShuffledVisitors(shuffleArray(visitors));
    }
  }, [visitors]);
  useEffect(() => {
    const checkInUser = async () => {
      const currentUser = await window.websim.getCurrentUser();
      if (!currentUser) return;
      try {
        await room.collection(COLLECTION_TYPE).upsert({
          id: currentUser.id
        });
      } catch (error) {
        console.error("Failed to check in user:", error);
      }
    };
    checkInUser();
  }, []);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("h1", { children: "The QR Wall of Visitors" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 119,
      columnNumber: 13
    }, this),
    loading && /* @__PURE__ */ jsxDEV("p", { children: "Loading visitors..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 120,
      columnNumber: 25
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "qr-grid", children: shuffledVisitors.map((visitor) => /* @__PURE__ */ jsxDEV(QRCodeCard, { visitor }, visitor.id, false, {
      fileName: "<stdin>",
      lineNumber: 123,
      columnNumber: 21
    }, this)) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 121,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 118,
    columnNumber: 9
  }, this);
}
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 131,
  columnNumber: 13
}));
