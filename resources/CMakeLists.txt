
file(GLOB QRC_FILES "*.qrc")

foreach(X IN LISTS QRC_FILES)
  get_filename_component(filename ${X} NAME_WLE)
  qt6_add_binary_resources(${filename} ${X})
  add_custom_command(TARGET ${filename} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy "${CMAKE_CURRENT_BINARY_DIR}/${filename}.rcc" "${PROJECT_SOURCE_DIR}/dist/${RESOURCE_DIR}/${filename}.rcc"
  )
endforeach()

