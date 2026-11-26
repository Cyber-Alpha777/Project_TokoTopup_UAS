package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

func init() {
	// nama field di pesan error mengikuti tag json
	validate.RegisterTagNameFunc(func(f reflect.StructField) string {
		name := strings.Split(f.Tag.Get("json"), ",")[0]
		if name == "-" {
			return ""
		}
		return name
	})
}

// decodeJSON membatasi ukuran body dan menolak field yang tidak dikenal.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "body JSON tidak valid")
		return false
	}
	return true
}

func validateStruct(s any) map[string]string {
	fields := map[string]string{}
	var verrs validator.ValidationErrors
	if err := validate.Struct(s); errors.As(err, &verrs) {
		for _, fe := range verrs {
			switch fe.Tag() {
			case "required":
				fields[fe.Field()] = "wajib diisi"
			case "email":
				fields[fe.Field()] = "format email tidak valid"
			case "min":
				fields[fe.Field()] = "minimal " + fe.Param() + " karakter"
			case "max":
				fields[fe.Field()] = "maksimal " + fe.Param() + " karakter"
			default:
				fields[fe.Field()] = "tidak valid"
			}
		}
	}
	return fields
}

func writeValidation(w http.ResponseWriter, fields map[string]string) {
	writeJSON(w, http.StatusBadRequest, map[string]any{
		"error": map[string]any{"code": "validation_error", "message": "data tidak valid", "fields": fields},
	})
}
