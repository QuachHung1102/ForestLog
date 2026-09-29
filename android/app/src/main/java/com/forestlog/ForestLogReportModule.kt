package com.forestlog

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ImageDecoder
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import org.json.JSONArray
import org.json.JSONObject

class ForestLogReportModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  override fun getName() = "ForestLogReport"

  @ReactMethod
  fun generateReport(payload: String, promise: Promise) {
    try {
      val report = JSONObject(payload)
      val outputDirectory = File(context.filesDir, "reports").apply { mkdirs() }
      val fileName = report.optString("fileName", "ForestLog-${report.getString("id")}.pdf")
        .replace(Regex("[^A-Za-z0-9._-]"), "_")
      val output = File(outputDirectory, fileName)
      ensureStorage(report, outputDirectory)

      val document = PdfDocument()
      val renderer = ReportRenderer(document)
      try {
        renderer.render(report)
        FileOutputStream(output).use(document::writeTo)
      } catch (error: Throwable) {
        output.delete()
        throw error
      } finally {
        document.close()
      }

      promise.resolve(
        Arguments.createMap().apply {
          putString("filePath", output.absolutePath)
          putString("fileUri", "file://${output.absolutePath}")
          putInt("pageCount", renderer.pageCount)
        },
      )
    } catch (error: Throwable) {
      val code = if (isStorageError(error)) "INSUFFICIENT_STORAGE" else "REPORT_ERROR"
      promise.reject(code, error.message ?: "Không thể tạo báo cáo PDF.", error)
    }
  }

  @ReactMethod
  fun shareReport(path: String, promise: Promise) {
    try {
      val uri = reportUri(path)
      val send = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      context.startActivity(
        Intent.createChooser(send, "Chia sẻ báo cáo ForestLog").apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
      )
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("SHARE_ERROR", "Không thể mở bảng chia sẻ.", error)
    }
  }

  @ReactMethod
  fun openReport(path: String, promise: Promise) {
    try {
      val view = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(reportUri(path), "application/pdf")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      context.startActivity(
        Intent.createChooser(view, "Mở báo cáo PDF").apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
      )
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("OPEN_ERROR", "Không tìm thấy ứng dụng mở PDF.", error)
    }
  }

  private fun reportUri(path: String) = FileProvider.getUriForFile(
    context,
    "${context.packageName}.files",
    File(path.removePrefix("file://")),
  )

  private fun ensureStorage(report: JSONObject, directory: File) {
    var required = 2L * 1024L * 1024L
    report.getJSONArray("events").forEachObject { event ->
      event.getJSONArray("photos").forEachObject { photo ->
        required += File(photo.getString("path").removePrefix("file://")).length() * 2L
      }
    }
    report.getJSONArray("observations").forEachObject { observation ->
      observation.getJSONArray("photos").forEachObject { photo ->
        required += File(photo.getString("path").removePrefix("file://")).length() * 2L
      }
    }
    if (directory.usableSpace < required) {
      throw InsufficientStorageException()
    }
  }

  private fun isStorageError(error: Throwable): Boolean =
    error is InsufficientStorageException ||
      (error is IOException && error.message.orEmpty().contains("space", ignoreCase = true))
}

private class InsufficientStorageException : IOException(
  "Không đủ dung lượng trống để tạo báo cáo.",
)

private class ReportRenderer(private val document: PdfDocument) {
  private val pageWidth = 595
  private val pageHeight = 842
  private val margin = 40f
  private val contentWidth = pageWidth - margin * 2
  private val titlePaint = paint(20f, true, Color.rgb(18, 60, 41))
  private val headingPaint = paint(14f, true, Color.rgb(24, 92, 58))
  private val bodyPaint = paint(11f, false, Color.rgb(23, 33, 27))
  private val metaPaint = paint(10f, false, Color.rgb(82, 97, 89))
  private var page: PdfDocument.Page? = null
  private var canvas: Canvas? = null
  private var y = margin
  var pageCount = 0
    private set

  fun render(report: JSONObject) {
    newPage()
    text("BÁO CÁO TUẦN TRA RỪNG", titlePaint, 8f)
    text(report.optString("fileName").removeSuffix(".pdf"), metaPaint, 18f)
    line()
    text("THÔNG TIN CHUYẾN TUẦN TRA", headingPaint, 8f)
    field("Người đi tuần", report.getString("rangerName"))
    field("Khu vực", report.getString("area"))
    field("Bắt đầu", report.getString("startedAt"))
    field("Kết thúc", report.getString("completedAt"))
    field("Thời tiết", report.getString("weather"))
    field("Quãng đường", report.getString("distance"))
    field("Báo cáo khẩn", report.getString("emergency"))

    val events = report.getJSONArray("events")
    text("SỰ KIỆN (${events.length()})", headingPaint, 10f)
    events.forEachObjectIndexed { index, event -> renderEvent(index + 1, event) }

    val observations = report.getJSONArray("observations")
    text("KẾT QUẢ QUAN TRẮC (${observations.length()})", headingPaint, 10f)
    observations.forEachObjectIndexed { index, observation ->
      renderObservation(index + 1, observation)
    }
    finishPage()
  }

  private fun renderEvent(number: Int, event: JSONObject) {
    ensure(92f)
    line()
    text("$number. ${event.getString("type")}", headingPaint, 6f)
    field("Mức độ", event.getString("severity"))
    field("Thời gian", event.getString("occurredAt"))
    field("GPS", event.getString("gps"))
    field("Ghi chú", event.getString("note"))

    val photos = event.getJSONArray("photos")
    if (photos.length() > 0) {
      text("Ảnh hiện trường (${photos.length()})", bodyPaint, 6f)
      photos.forEachObject { photo -> drawPhoto(photo.getString("path")) }
    }
    y += 8f
  }

  private fun renderObservation(number: Int, observation: JSONObject) {
    ensure(150f)
    line()
    text("$number. Quan trắc thời tiết", headingPaint, 6f)
    field("Thời gian", observation.getString("observedAt"))
    field("Nguồn số liệu", observation.getString("source"))
    field("GPS", observation.getString("gps"))
    field("Nhiệt độ", observation.getString("airTemperature"))
    field("Độ ẩm", observation.getString("relativeHumidity"))
    field("Thời tiết", observation.getString("weather"))
    field("Lượng mưa", observation.getString("rainfall"))
    if (observation.getString("rainfall") != "—") {
      field("Khoảng đo mưa", observation.getString("rainfallInterval"))
      field("Mã trạm", observation.getString("stationCode"))
    }
    field("Dấu hiệu cháy", observation.getString("fireSign"))
    field("Thiết bị / phương pháp", observation.getString("deviceMethod"))
    field("Kiểm tra hiệu chuẩn", observation.getString("calibrationCheckedAt"))
    field("Ghi chú", observation.getString("note"))

    val photos = observation.getJSONArray("photos")
    if (photos.length() > 0) {
      text("Ảnh quan trắc (${photos.length()})", bodyPaint, 6f)
      photos.forEachObject { photo -> drawPhoto(photo.getString("path")) }
    }
    y += 8f
  }

  private fun field(label: String, value: String) {
    text("$label: $value", bodyPaint, 4f)
  }

  private fun text(value: String, paint: Paint, after: Float) {
    val lineHeight = paint.textSize * 1.45f
    for (line in wrap(value, paint)) {
      ensure(lineHeight)
      y += paint.textSize
      canvas!!.drawText(line, margin, y, paint)
      y += lineHeight - paint.textSize
    }
    y += after
  }

  private fun wrap(value: String, paint: Paint): List<String> {
    val output = mutableListOf<String>()
    for (paragraph in value.split('\n')) {
      var line = ""
      for (word in paragraph.split(' ')) {
        val candidate = if (line.isEmpty()) word else "$line $word"
        if (paint.measureText(candidate) <= contentWidth || line.isEmpty()) {
          line = candidate
        } else {
          output += line
          line = word
        }
      }
      output += line
    }
    return output
  }

  private fun drawPhoto(uri: String) {
    val bitmap = decodeBitmap(File(uri.removePrefix("file://"))) ?: return
    try {
      val maxHeight = 250f
      val scale = minOf(contentWidth / bitmap.width, maxHeight / bitmap.height, 1f)
      val width = bitmap.width * scale
      val height = bitmap.height * scale
      ensure(height + 8f)
      canvas!!.drawBitmap(
        bitmap,
        null,
        android.graphics.RectF(margin, y, margin + width, y + height),
        null,
      )
      y += height + 8f
    } finally {
      bitmap.recycle()
    }
  }

  private fun line() {
    ensure(14f)
    canvas!!.drawLine(margin, y + 5f, pageWidth - margin, y + 5f, metaPaint)
    y += 14f
  }

  private fun ensure(height: Float) {
    if (y + height > pageHeight - margin) newPage()
  }

  private fun newPage() {
    finishPage()
    pageCount += 1
    page = document.startPage(
      PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageCount).create(),
    )
    canvas = page!!.canvas
    y = margin
    canvas!!.drawText("ForestLog", pageWidth - margin - 48f, 24f, metaPaint)
  }

  private fun finishPage() {
    page?.let(document::finishPage)
    page = null
    canvas = null
  }

  private fun decodeBitmap(file: File): Bitmap? {
    if (!file.exists()) return null
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      ImageDecoder.decodeBitmap(ImageDecoder.createSource(file)) { decoder, info, _ ->
        decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        val scale = minOf(1200f / info.size.width, 1200f / info.size.height, 1f)
        decoder.setTargetSize(
          (info.size.width * scale).toInt(),
          (info.size.height * scale).toInt(),
        )
      }
    } else {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, bounds)
      var sample = 1
      while (bounds.outWidth / sample > 1200 || bounds.outHeight / sample > 1200) {
        sample *= 2
      }
      BitmapFactory.decodeFile(
        file.absolutePath,
        BitmapFactory.Options().apply { inSampleSize = sample },
      )
    }
  }

  companion object {
    private fun paint(size: Float, bold: Boolean, color: Int) = Paint(1).apply {
      textSize = size
      this.color = color
      typeface = Typeface.create(Typeface.SANS_SERIF, if (bold) Typeface.BOLD else Typeface.NORMAL)
    }
  }
}

private inline fun JSONArray.forEachObject(block: (JSONObject) -> Unit) {
  for (index in 0 until length()) block(getJSONObject(index))
}

private inline fun JSONArray.forEachObjectIndexed(block: (Int, JSONObject) -> Unit) {
  for (index in 0 until length()) block(index, getJSONObject(index))
}
