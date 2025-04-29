
interface AdminIconButtonProps {
  setShowSettings: (value: boolean) => void;
  showSettings: boolean;
  onClose: () => void;  // new prop for closing the admin view
}

export const AdminIconButton = ({
  setShowSettings,
  showSettings,
  // new prop for refreshing the poll on closing the admin view
  onClose,
}: AdminIconButtonProps) => {
  return (
    <div className="flex w-full">
      <button
        onClick={() => {
          setShowSettings(!showSettings);
          if (showSettings) onClose();
        }}
        className={`icon-with-rounded-border mb-4 ${!showSettings ? 'ml-auto' : ''}`}
      >
        <img
          src={`https://sdk-style.s3.amazonaws.com/icons/${showSettings ? "arrow" : "cog"}.svg`}
        />
      </button>
    </div>
  );
};


export default AdminIconButton;
