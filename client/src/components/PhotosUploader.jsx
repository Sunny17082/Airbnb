import React, { useState } from 'react';
import axios from "axios";

const PhotosUploader = ({addedPhotos, onChange}) => {
    const [photoLink, setPhotoLink] = useState("");

    async function addPhotoByLink(ev) {
		ev.preventDefault();
		const { data: filename } = await axios.post("/upload-by-link", {
			link: photoLink,
		});
		onChange((prev) => {
			return [...prev, filename];
		});
		setPhotoLink("");
	}

	function uploadPhoto(ev) {
		const files = ev.target.files;
		const data = new FormData();
		for (let i = 0; i < files.length; i++) {
			data.append("photos", files[i]);
		}
		axios
			.post("/upload", data, {
				headers: { "content-type": "multipart/form-data" },
			})
			.then((res) => {
				const { data: filenames } = res;
				onChange((prev) => {
					return [...prev, ...filenames];
				});
			});
    }
    
    return (
		<>
			<div className="flex gap-2">
				<input
					type="text"
					value={photoLink}
					onChange={(ev) => setPhotoLink(ev.target.value)}
					placeholder="Add using link .....png"
				/>
				<button
					onClick={addPhotoByLink}
					className="bg-gray-200 grow text-black px-4 rounded-2xl"
				>
					Add&nbsp;Photo
				</button>
			</div>
			<div className="mt-3 grid gap-2 grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ">
				{addedPhotos.length > 0 &&
					addedPhotos.map((link) => (
						<div className="h-32 flex" key={link}>
							<img
								className="rounded-2xl w-full object-cover"
								src={"http://localhost:5000/uploads/" + link}
							/>
						</div>
					))}
				<label className="h-32 flex justify-center items-center gap-1 border bg-transparent rounded-2xl p-8 text-2xl text-gray-600 cursor-pointer">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="w-8 h-8"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
						/>
					</svg>
					<input
						type="file"
						multiple
						className="hidden"
						onChange={uploadPhoto}
					/>
					Upload
				</label>
			</div>
		</>
    );
}

export default PhotosUploader