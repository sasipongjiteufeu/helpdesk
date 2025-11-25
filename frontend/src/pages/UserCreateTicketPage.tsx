// src/pages/UserCreateTicketPage.tsx
import { FormEvent, ChangeEvent, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import AppHeaderBackend from "../components/AppHeaderBackend";
import Swal from "sweetalert2";
import { FaUpload } from "react-icons/fa6";

export default function UserCreateTicketPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center font-sans bg-gray-100 text-gray-900">
        Checking your access…
      </div>
    );
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // 🔢 จำกัดเบอร์โทร: ตัวเลขเท่านั้น และไม่เกิน 10 หลัก
  // function handleTelephoneChange(e: ChangeEvent<HTMLInputElement>) {
  //   const raw = e.target.value;
  //   const digitsOnly = raw.replace(/\D/g, ""); // เอาเฉพาะตัวเลข
  //   const limited = digitsOnly.slice(0, 10); // ตัดให้เหลือ 10 ตัว
  //   setTelephone(limited);
  // }

  // helper เล็ก ๆ กัน input แปลก ๆ นิดหน่อย (trim และตัด length)
  function sanitizeText(input: string, maxLen: number) {
    return input.trim().slice(0, maxLen);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const safeTitle = sanitizeText(title, 200);
      const safeDetail = sanitizeText(detail, 2000);
      const safeTel = sanitizeText(telephone, 10); // เผื่อ safety อีกชั้น

      const form = new FormData();
      form.append("title", safeTitle);
      form.append("detail", safeDetail);
      if (safeTel) form.append("telephone", safeTel);

      files.forEach((f) => form.append("pictures", f));

      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        if (res.status === 413) {
          // Get max size from server header if available
          const max = res.headers.get("X-Max-File-Size") || "10MB";
          setError(`413 ไฟล์ใหญ่เกินไป ส่งได้ไม่เกิน ${max}`);
        } else {
          setError(`Failed to create ticket (${res.status})`);
        }
        return;
      }

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "เพิ่มข้อมูลสำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });

      navigate("/user", { replace: true });
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  }

  function handleCancel() {
    navigate("/user");
  }

  function uploadFile() {
    fileInputRef.current?.click();
  }

  return (
    <div className="min-h-screen  bg-gray-100 p-6">
      <div className=" container mx-auto bg-white rounded-2xl shadow-2xl p-5">
        {/* Header */}
        <AppHeaderBackend user={user} title={"USER"} />

        {/* Content card */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h2 className="mt-0 mb-3 text-xl font-semibold">สร้างคำร้องใหม่</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-900 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-semibold">หัวข้อ</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm"
                required
              />
            </div>

            {/* Detail */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-semibold">
                รายละเอียด
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={2000}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm min-h-[120px] resize-y"
              />
            </div>

            {/* Tel */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-semibold">
                เบอร์โทรที่ติดต่อได้
              </label>
              <input
                type="text"
                // inputMode="numeric"
                // pattern="\d{0,10}"
                // maxLength={10}
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm"
                placeholder="0XXXXXXXXX"
              />
            </div>

            {/* Upload */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-semibold">
                แนบไฟล์ (ถ้ามี เช่น รูป, วิดีโอ, PDF, Word)
              </label>
              <button
                type="button"
                className="px-2 py-2 bg-amber-500 rounded-2xl text-white cursor-pointer hover:bg-amber-600 inline-flex items-center text-center"
                onClick={uploadFile}
              >
                <FaUpload className="mr-2" /> อัพโหลดไฟล์
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {files.length > 0 && (
                <div className="mt-2 rounded-xl border border-gray-300 p-3 flex flex-col gap-2 bg-white">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="w-6 h-6 rounded-full border-none bg-red-500 text-gray-50 font-bold cursor-pointer flex-shrink-0"
                        title="Remove file"
                      >
                        x
                      </button>
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {f.name}
                      </span>
                      <span className="opacity-70">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row md:justify-end mt-4 gap-2">
              <button
                type="submit"
                disabled={creating}
                className={`px-5 py-2 rounded-full border-none font-semibold text-white text-center ${
                  creating
                    ? "bg-gray-400 cursor-default"
                    : "bg-green-500 cursor-pointer hover:bg-green-700"
                } text-gray-900`}
              >
                {creating ? "กำลังบันทึก…" : "บันทึก"}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 rounded-full border border-gray-300 bg-white cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
