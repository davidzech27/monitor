"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { type PutBlobResult } from "@vercel/blob"
import useStickyState from "~/util/useStickyState"

export default function HomePage() {
	const [photoURLs, setPhotoURLs] = useStickyState<string[]>([], "photoURLs")

	const effectRun = useRef(false)

	useEffect(() => {
		if (effectRun.current) return

		effectRun.current = true

		const takePhoto = () =>
			new Promise<void>((res) => {
				void navigator.mediaDevices
					.getUserMedia({
						video: true,
					})
					.then((stream) => {
						const video = document.createElement("video")
						const canvas = document.createElement("canvas")

						video.style.display = "none"
						canvas.style.display = "none"

						document.body.appendChild(video)
						document.body.appendChild(canvas)

						video.srcObject = stream

						void video.play().then(() => {
							const width = window.innerWidth

							const height =
								(video.videoHeight / video.videoWidth) * width

							video.width = width
							video.height = height

							canvas.width = width
							canvas.height = height

							const context = canvas.getContext("2d")

							context?.drawImage(video, 0, 0, width, height)

							canvas.toBlob((blob) => {
								if (blob === null) return

								const file = new File([blob], "image.png", {
									type: "image/png",
								})

								void fetch("/upload", {
									method: "POST",
									body: file,
								}).then(async (response) => {
									const json = await response.json()

									// eslint-disable-next-line @typescript-eslint/no-unsafe-return
									setPhotoURLs((photoURLs) => [
										...photoURLs,
										// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
										(json as PutBlobResult).url,
									])
								})
							})

							stream.getTracks().map((track) => track.stop())

							res()
						})
					})
			})

		void takePhoto()

		let photoTimeout: NodeJS.Timeout | undefined = undefined

		const setRecursivePhotoTimeout = () => {
			photoTimeout = setTimeout(
				() => {
					void takePhoto()

					setRecursivePhotoTimeout()
				},
				Math.random() * 1000 * 60 * 10,
			)
		}

		setRecursivePhotoTimeout()

		return () => {
			clearTimeout(photoTimeout)
		}
	}, [])

	return photoURLs.map((photo, index) => (
		<Image
			key={index}
			src={photo}
			alt="photo of you"
			width={window.innerWidth}
			height={window.innerHeight}
		/>
	))
}
