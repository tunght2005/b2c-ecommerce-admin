export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_PRESET

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    throw new Error('Upload ảnh thất bại!')
  }

  const data = await res.json()
  return data.secure_url // URL trả về
}
