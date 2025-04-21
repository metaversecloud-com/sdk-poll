// @TODO: For refactor of AdminView.tsx


// import { useState, useEffect, useRef } from "react";

// export interface OptionButtonProps {
//   text: string;
//   voteText: string;
//   isSelected: boolean;
//   onClick: () => void;
//   showVote: boolean;
// }

// /**
//  * OptionButton component for displaying poll options.
//  * @param {string} text - The text of the option.
//  * @param {string} voteText - The text to display when the option is selected.
//  * @param {boolean} isSelected - Whether the option is selected or not.
//  * @param {function} onClick - Function to call when the button is clicked.
//  */
// export default function OptionButton({
//   text,
//   voteText,
//   isSelected,
//   onClick,
//   showVote,
// }: OptionButtonProps) {
//   const labelRef = useRef<HTMLSpanElement>(null);
//   const [wrapped, setWrapped] = useState(false);

//   useEffect(() => {
//     const el = labelRef.current;
//     if (el) {
//       setWrapped(el.scrollHeight > el.clientHeight);
//     }
//   }, [text]);

//   return (
//     <button
//       onClick={onClick}
//       className={`
//         btn !h-auto 
//         ${wrapped ? "!py-7" : "py-2"} 
//         ${isSelected ? "border-2 border-blue-500 bg-transparent" : "btn-outline"}
//       `}
//     >
//       <div className="grid grid-cols-[1fr_auto] gap-2">
//         <span
//           ref={labelRef}
//           className="whitespace-normal break-words"
//         >
//           {text}
//         </span>

//         {/* The opacity of the vote text is controlled by the isSelected prop or isAdmin prop. */}
//         <span
//           className="whitespace-nowrap italic transition-opacity duration-300 ease-in-out"
//           style={{ opacity: showVote ? 1 : 0 }}
//         >
//           {voteText}
//         </span>
//       </div>
//     </button>
//   );
// }
