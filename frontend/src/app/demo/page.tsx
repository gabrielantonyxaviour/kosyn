export default function DemoVideoPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#000",
      }}
    >
      <video
        controls
        autoPlay
        playsInline
        style={{ maxWidth: "100%", maxHeight: "100vh" }}
      >
        <source
          src="https://pub-347d5fe26d3443e2ab3b82f35e7ee086.r2.dev/videos/kosyn-demo.mp4"
          type="video/mp4"
        />
      </video>
    </div>
  );
}
