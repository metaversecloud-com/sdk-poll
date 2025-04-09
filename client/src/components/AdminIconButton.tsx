
interface AdminIconButtonProps {
  setShowSettings: (value: boolean) => void;
  showSettings: boolean;
  onClose: () => void;  // new prop for closing the admin view
}

export const AdminIconButton = ({
  setShowSettings,
  showSettings,
  onClose,
}: AdminIconButtonProps) => {
  return (
    <button
      className="icon-with-rounded-border mb-4"
      onClick={() => {
        // Toggle showSettings
        setShowSettings(!showSettings);
        // If currently showing admin, call onClose to trigger close logic
        if (showSettings) {
          onClose();
        }
      }}
    >
      <img
        src={`https://sdk-style.s3.amazonaws.com/icons/${showSettings ? "arrow" : "cog"}.svg`}
      />
    </button>
  );
};

export default AdminIconButton;
