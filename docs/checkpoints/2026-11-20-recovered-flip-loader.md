# Recovered flip art integration checkpoint

Recovered in ChatGPT Library: Presidential Combat Flip Animation Concepts.png (Trump/Kim, forward/back, eight poses each), and Presidential Flip Animation Sprite Sheet.png (Trump 16-frame storyboard). A 32-crop concept pack was prepared in the ChatGPT workspace, NOT transferred to the Mac. Crops are preliminary and may contain labels/background artifacts.

Active Mac game loader now expects eight transparent PNGs for each fighter/direction, named trump-flip-forward-1.png through -8.png, trump-flip-backward-1.png through -8.png, kim-flip-forward-1.png through -8.png and kim-flip-backward-1.png through -8.png, under public/art/sprites. Tests: 347 pass.

BLOCKER: These 32 files are NOT yet present on the Mac. Until transferred and visually cleaned, fallback whole-body rotation remains active. Do not claim animation is fixed or invite a new visual test as if it were. Preserve existing gameplay and backups. Once transferred, verify all 32 sprite assets load and run Safari QA.
