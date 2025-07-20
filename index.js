const { useState, useEffect, useSyncExternalStore, useRef } = React;

const room = new WebsimSocket();
const COLLECTION_TYPE = 'visitor_qr_v1';

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

    useEffect(() => {
        if (canvasRef.current && visitor.username) {
            QRCode.toCanvas(canvasRef.current, profileUrl, { width: 180, margin: 1 }, function (error) {
                if (error) console.error(error);
            });
        }
    }, [visitor.username, profileUrl]);

    return (
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="qr-card">
            <canvas ref={canvasRef} className="qr-code-canvas"></canvas>
            <div className="user-info">
                <img src={`https://images.websim.com/avatar/${visitor.username}`} alt={`${visitor.username}'s avatar`} className="user-avatar" />
                <span className="username">@{visitor.username}</span>
            </div>
        </a>
    );
}

function App() {
    const visitors = useSyncExternalStore(
        room.collection(COLLECTION_TYPE).subscribe,
        room.collection(COLLECTION_TYPE).getList
    ) ?? [];

    const [shuffledVisitors, setShuffledVisitors] = useState([]);
    const [checkedIn, setCheckedIn] = useState(false);

    useEffect(() => {
        setShuffledVisitors(shuffleArray(visitors));
    }, [visitors]);

    useEffect(() => {
        const checkInUser = async () => {
            if (checkedIn || !visitors) return;

            const currentUser = await window.websim.getCurrentUser();
            if (!currentUser) return;

            const existingVisitor = visitors.find(v => v.username === currentUser.username);

            if (!existingVisitor) {
                console.log(`Checking in new user: ${currentUser.username}`);
                try {
                    await room.collection(COLLECTION_TYPE).create({});
                } catch (error) {
                    console.error("Failed to check in user:", error);
                }
            }
            setCheckedIn(true);
        };

        checkInUser();
    }, [visitors, checkedIn]);

    return (
        <>
            <h1>The QR Wall of Visitors</h1>
            <div className="qr-grid">
                {shuffledVisitors.map(visitor => (
                    <QRCodeCard key={visitor.id} visitor={visitor} />
                ))}
            </div>
        </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

