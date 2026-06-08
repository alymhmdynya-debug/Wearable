/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function LuxuryBackground() {
  return (
    <div className="fixed inset-0 w-full h-full -z-20 bg-[#050505] pointer-events-none select-none">
      {/* High-end minimalist radial illumination with subtle metallic depth */}
      <div 
        className="absolute inset-0 opacity-40 bg-radial-[circle_at_center]"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 45%, #0B0B0D 0%, #030304 100%)',
        }}
      />
      {/* Subtle bottom-to-top gradient for classic structure */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
    </div>
  );
}
