"use client"

import { useEffect, useState } from "react"
import { type PutBlobResult } from "@vercel/blob"

import useStickyState from "~/util/useStickyState"

const takePhoto = () =>
	new Promise<File>((res) => {
		void navigator.mediaDevices
			.getUserMedia({
				video: true,
			})
			.then(async (stream) => {
				const video = document.createElement("video")
				const canvas = document.createElement("canvas")

				video.style.display = "none"
				canvas.style.display = "none"

				document.body.appendChild(video)
				document.body.appendChild(canvas)

				video.srcObject = stream
				await video.play()

				const width = window.innerWidth
				const height = (video.videoHeight / video.videoWidth) * width

				video.width = width
				video.height = height

				canvas.width = width
				canvas.height = height

				await new Promise((res) => setTimeout(res, 500))

				const context = canvas.getContext("2d")

				context?.drawImage(video, 0, 0, width, height)

				canvas.toBlob((blob) => {
					if (blob === null) return

					const file = new File([blob], "image.png", {
						type: "image/png",
					})

					stream.getTracks().map((track) => track.stop())

					document.body.removeChild(video)
					document.body.removeChild(canvas)

					res(file)
				})
			})
	})

export default function HomePage() {
	const [allPhotoURLs, setAllPhotoURLs] = useStickyState<string[]>(
		[],
		"allPhotoURLs",
	)

	const [effectRun, setEffectRun] = useState(false)

	useEffect(() => {
		if (effectRun) return

		setEffectRun(true)

		let photoTimeout: NodeJS.Timeout | undefined = undefined

		const setRecursivePhotoTimeout = () => {
			photoTimeout = setTimeout(
				() => {
					void takePhoto().then(async (file) => {
						const response = await fetch("/upload", {
							method: "POST",
							body: file,
						})

						const json = await response.json()

						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						setAllPhotoURLs((photoURLs) => [
							...photoURLs,
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							(json as PutBlobResult).url,
						])

						setRecursivePhotoTimeout()
					})
				},
				Math.random() * 1000 * 60 * 10,
			)
		}

		setRecursivePhotoTimeout()

		return () => {
			clearTimeout(photoTimeout)
		}
	}, [])

	const [dateString, setDateString] = useStickyState(
		new Date().toString(),
		"dateString",
	)

	const date = new Date(dateString)

	const setDate = (date: Date) => setDateString(date.toString())

	const datePhotoURLs = allPhotoURLs.filter((photoURL) => {
		const photoURLDate = new Date(
			decodeURIComponent(photoURL.split("/").at(-1) ?? "")
				.split("-")
				.slice(0, -1)
				.join("-"),
		)

		return (
			photoURLDate.getFullYear() === date.getFullYear() &&
			photoURLDate.getMonth() === date.getMonth() &&
			photoURLDate.getDate() === date.getDate()
		)
	})

	if (!effectRun) return null

	return (
		<>
			<button
				onClick={() =>
					setDate(new Date(date.getTime() - 1000 * 60 * 60 * 24))
				}
			>
				previous day
			</button>
			<button
				onClick={() =>
					setDate(new Date(date.getTime() + 1000 * 60 * 60 * 24))
				}
			>
				next day
			</button>
			{date.getMonth() + 1}/{date.getDate()}/{date.getFullYear()}
			{datePhotoURLs.map((photoURL) => (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					key={photoURL}
					src={photoURL}
					alt="photo of you"
					width={window.innerWidth}
					height={window.innerHeight}
				/>
			))}
		</>
	)
}
